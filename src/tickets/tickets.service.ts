import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';
import * as crypto from 'crypto';

interface QrData {
  ticketId: string;
  userId: string;
  eventId: string;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  private readonly hmacSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.hmacSecret = this.config.get<string>('qr.hmacSecret') ?? '';
  }

  // ─── Generar ticket QR ───────────────────────────────────────────
  async create(userId: string, eventId: string) {
    // 1. Verificar que el evento existe y está publicado
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado.');
    if (event.status !== 'PUBLISHED') {
      throw new BadRequestException('El evento no está disponible para reservas.');
    }
    if (event.mode === 'STREAMING') {
      throw new BadRequestException('Este evento es solo streaming, no requiere ticket presencial.');
    }

    // 2. Verificar suscripción activa
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new UnauthorizedException('Necesitas una suscripción activa para obtener entradas.');
    }

    // 3. Verificar que no tenga ya un ticket ACTIVO (no usado) para este evento
    const existingTicket = await this.prisma.ticket.findFirst({
      where: { userId, eventId, used: false },
    });
    if (existingTicket) {
      throw new ConflictException('Ya tienes una entrada activa para este evento.');
    }

    // 4. Verificar capacidad
    if (event.maxCapacity) {
      const ticketCount = await this.prisma.ticket.count({ where: { eventId } });
      if (ticketCount >= event.maxCapacity) {
        throw new BadRequestException('El evento está lleno.');
      }
    }

    // 5. Generar el ticket ID y payload firmado
    const ticketId = crypto.randomUUID();
    const issuedAt = Date.now();
    // QR válido hasta la fecha del evento + 4 horas
    const expiresAt = new Date(event.date).getTime() + 4 * 60 * 60 * 1000;

    const payload = { ticketId, userId, eventId, issuedAt, expiresAt };
    const signature = this.sign(payload);
    const qrPayload = JSON.stringify({ ...payload, signature });

    // 6. Guardar en BD
    const ticket = await this.prisma.ticket.create({
      data: {
        id: ticketId,
        userId,
        eventId,
        qrPayload,
        expiresAt: new Date(expiresAt),
      },
    });

    this.logger.log(`Ticket generado: ${ticketId} para evento ${eventId} por usuario ${userId}`);
    return ticket;
  }

  // ─── Mis tickets ─────────────────────────────────────────────────
  async findMyTickets(userId: string) {
    return this.prisma.ticket.findMany({
      where: { userId },
      include: {
        event: { select: { id: true, title: true, date: true, location: true, mode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Validar QR (Staff) ──────────────────────────────────────────
  async validate(rawQrPayload: string, scannedById: string) {
    let qrData: QrData;

    // 1. Parsear el JSON del QR
    try {
      qrData = JSON.parse(rawQrPayload) as QrData;
    } catch {
      throw new BadRequestException('QR inválido: formato incorrecto.');
    }

    const { ticketId, userId, eventId, issuedAt, expiresAt, signature } = qrData;

    // 2. Verificar firma HMAC
    const expectedSignature = this.sign({ ticketId, userId, eventId, issuedAt, expiresAt });
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      this.logger.warn(`Intento de QR con firma inválida: ticketId=${ticketId}`);
      throw new BadRequestException('QR inválido: firma no coincide.');
    }

    // 3. Verificar que no haya expirado
    if (Date.now() > expiresAt) {
      throw new BadRequestException('QR vencido.');
    }

    // 4. Buscar el ticket en BD
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado en el sistema.');
    }

    // 5. Verificar reutilización
    if (ticket.used) {
      this.logger.warn(`Intento de reutilizar ticket: ${ticketId}, usado en: ${ticket.usedAt}`);
      throw new ConflictException({
        message: 'ACCESO DENEGADO: Este QR ya fue utilizado.',
        usedAt: ticket.usedAt,
        alert: true,
      });
    }

    // 6. Marcar como usado
    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        used: true,
        usedAt: new Date(),
        scannedBy: scannedById,
      },
      include: {
        user: { select: { fullName: true, email: true } },
        event: { select: { title: true, date: true } },
      },
    });

    this.logger.log(`Acceso validado: ticket=${ticketId}, usuario=${userId}, evento=${eventId}`);
    return {
      valid: true,
      message: 'ACCESO PERMITIDO ✓',
      ticket: {
        id: updatedTicket.id,
        attendee: updatedTicket.user.fullName,
        event: updatedTicket.event.title,
        validatedAt: updatedTicket.usedAt,
      },
    };
  }

  // ─── Admin: todos los tickets de un evento ──────────────────────
  async findByEvent(eventId: string) {
    return this.prisma.ticket.findMany({
      where: { eventId },
      include: {
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── HMAC signing ────────────────────────────────────────────────
  private sign(data: object): string {
    return crypto
      .createHmac('sha256', this.hmacSecret)
      .update(JSON.stringify(data))
      .digest('hex');
  }
}
