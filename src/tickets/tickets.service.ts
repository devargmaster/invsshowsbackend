import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { TicketStatus, TicketTransferStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { signQrPayload } from '../common/utils/qr-signer.util';

interface QrData {
  ticketId: string;
  eventId: string;
  categoryId: string;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  private readonly hmacSecret: string;
  private readonly webBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
  ) {
    this.hmacSecret = this.config.get<string>('qr.hmacSecret') ?? '';
    this.webBaseUrl = this.config.get<string>('webBaseUrl') ?? '';
  }

  // ─── Mis entradas: propias + sin asignar de mis compras ─────────
  async findMyTickets(userId: string) {
    return this.prisma.ticket.findMany({
      where: {
        OR: [
          { holderUserId: userId },
          { holderUserId: null, purchaserUserId: userId },
        ],
      },
      include: {
        event: { select: { id: true, title: true, date: true, location: true, mode: true } },
        category: true,
        // Solo envíos pendientes vigentes: los vencidos se marcan EXPIRED de
        // forma perezosa (al abrir el link), así que además filtramos por
        // fecha para que el "pendiente de aceptar" desaparezca solo.
        transfers: {
          where: { status: TicketTransferStatus.PENDING, expiresAt: { gt: new Date() } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Validar QR (Staff) ──────────────────────────────────────────
  async validate(rawQrPayload: string, scannedById: string) {
    let qrData: QrData;

    try {
      qrData = JSON.parse(rawQrPayload) as QrData;
    } catch {
      throw new BadRequestException('QR inválido: formato incorrecto.');
    }

    const { ticketId, eventId, categoryId, issuedAt, expiresAt, signature } = qrData;

    const expectedSignature = signQrPayload({ ticketId, eventId, categoryId, issuedAt, expiresAt }, this.hmacSecret);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      this.logger.warn(`Intento de QR con firma inválida: ticketId=${ticketId}`);
      throw new BadRequestException('QR inválido: firma no coincide.');
    }

    if (Date.now() > expiresAt) {
      throw new BadRequestException('QR vencido.');
    }

    // Chequeo "activo" + marcado "usado" en una sola operación atómica: si
    // dos scanners validan el mismo QR en simultáneo, solo uno gana la carrera.
    const { count } = await this.prisma.ticket.updateMany({
      where: { id: ticketId, status: TicketStatus.ACTIVE },
      data: { status: TicketStatus.USED, usedAt: new Date(), scannedBy: scannedById },
    });

    if (count === 0) {
      const existing = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!existing) {
        throw new NotFoundException('Ticket no encontrado en el sistema.');
      }
      if (existing.status === TicketStatus.USED) {
        this.logger.warn(`Intento de reutilizar ticket: ${ticketId}, usado en: ${existing.usedAt}`);
        throw new ConflictException({
          message: 'ACCESO DENEGADO: Este QR ya fue utilizado.',
          usedAt: existing.usedAt,
          alert: true,
        });
      }
      throw new BadRequestException(`Este ticket no está activo (estado: ${existing.status}).`);
    }

    const updatedTicket = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: {
        holder: { select: { fullName: true, email: true } },
        purchaser: { select: { fullName: true, email: true } },
        event: { select: { title: true, date: true } },
      },
    });

    const attendee = updatedTicket.holder?.fullName ?? updatedTicket.purchaser.fullName;

    this.logger.log(`Acceso validado: ticket=${ticketId}, evento=${eventId}`);
    return {
      valid: true,
      message: 'ACCESO PERMITIDO ✓',
      ticket: {
        id: updatedTicket.id,
        attendee,
        event: updatedTicket.event.title,
        validatedAt: updatedTicket.usedAt,
      },
    };
  }

  // ─── Admin/Staff: todas las entradas de un evento ───────────────
  async findByEvent(eventId: string) {
    return this.prisma.ticket.findMany({
      where: { eventId },
      include: {
        holder: { select: { fullName: true, email: true } },
        purchaser: { select: { fullName: true, email: true } },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Compartir una entrada por email ─────────────────────────────
  async createTransfer(ticketId: string, fromUserId: string, toEmail: string) {
    const normalizedEmail = toEmail.trim().toLowerCase();

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { purchaser: true, event: true, category: true },
    });
    if (!ticket) throw new NotFoundException('Entrada no encontrada.');
    if (ticket.purchaserUserId !== fromUserId) {
      throw new ForbiddenException('No podés compartir una entrada que no compraste.');
    }
    if (ticket.status !== TicketStatus.ACTIVE) {
      throw new BadRequestException('Esta entrada no está activa.');
    }
    // Vale compartir una entrada sin asignar o asignada a uno mismo (ej:
    // compré una sola entrada pero al evento va otra persona). Solo se
    // bloquea si ya la tiene otra persona.
    if (ticket.holderUserId && ticket.holderUserId !== fromUserId) {
      throw new BadRequestException('Esta entrada ya está asignada a otra persona.');
    }
    if (normalizedEmail === ticket.purchaser.email.toLowerCase()) {
      throw new BadRequestException('No podés compartirte la entrada a vos mismo.');
    }

    const existingPending = await this.prisma.ticketTransfer.findFirst({
      where: { ticketId, status: TicketTransferStatus.PENDING },
    });
    if (existingPending) {
      if (existingPending.expiresAt < new Date()) {
        // Vencida: se marca EXPIRED acá (expiración perezosa, igual que al
        // abrir el link) y se permite compartir de nuevo.
        await this.prisma.ticketTransfer.update({
          where: { id: existingPending.id },
          data: { status: TicketTransferStatus.EXPIRED },
        });
      } else {
        throw new ConflictException(
          'Ya hay un envío pendiente para esta entrada. Cancelalo antes de reenviar a otro email.',
        );
      }
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const transfer = await this.prisma.ticketTransfer.create({
      data: { ticketId, fromUserId, toEmail: normalizedEmail, token, expiresAt },
    });

    this.mailService.sendTransferInvitation(
      normalizedEmail,
      ticket.purchaser.fullName,
      ticket.event.title,
      `${this.webBaseUrl}/transfers/${token}`,
      {
        qrPayload: ticket.qrPayload,
        eventDate: ticket.event.date,
        eventLocation: ticket.event.location,
        categoryName: ticket.category?.name ?? null,
      },
    );

    return transfer;
  }

  // ─── Cancelar un envío pendiente ─────────────────────────────────
  async cancelTransfer(transferId: string, userId: string) {
    const transfer = await this.prisma.ticketTransfer.findUnique({
      where: { id: transferId },
      include: { ticket: { include: { event: true } } },
    });
    if (!transfer) throw new NotFoundException('Envío no encontrado.');
    if (transfer.fromUserId !== userId) throw new ForbiddenException('No podés cancelar este envío.');
    if (transfer.status !== TicketTransferStatus.PENDING) {
      throw new BadRequestException('Este envío ya no está pendiente.');
    }

    const updated = await this.prisma.ticketTransfer.update({
      where: { id: transferId },
      data: { status: TicketTransferStatus.CANCELLED, cancelledAt: new Date() },
    });

    return updated;
  }

  // ─── Entradas que me compartieron, pendientes de aceptar ────────
  async findIncomingTransfers(userEmail: string) {
    return this.prisma.ticketTransfer.findMany({
      where: { toEmail: userEmail.trim().toLowerCase(), status: TicketTransferStatus.PENDING },
      include: {
        ticket: { include: { event: true, category: true } },
        fromUser: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Detalle público de una invitación (para la pantalla de aceptar) ─
  async findTransferByToken(token: string) {
    const transfer = await this.getValidPendingTransfer(token);
    const recipientAccount = await this.prisma.user.findUnique({ where: { email: transfer.toEmail } });

    return {
      eventTitle: transfer.ticket.event.title,
      categoryName: transfer.ticket.category.name,
      fromUserName: transfer.fromUser.fullName,
      toEmail: transfer.toEmail,
      recipientHasAccount: !!recipientAccount,
    };
  }

  // ─── Aceptar (ya con cuenta y sesión iniciada) ──────────────────
  async acceptTransfer(token: string, currentUser: { id: string; email: string }) {
    const transfer = await this.getValidPendingTransfer(token);

    if (transfer.toEmail !== currentUser.email.trim().toLowerCase()) {
      throw new ForbiddenException('Esta invitación es para otro email. Iniciá sesión con el email correcto.');
    }

    await this.completeAcceptance(transfer.id, transfer.ticketId, transfer.fromUserId, transfer.toEmail, currentUser.id);
    return { success: true };
  }

  // ─── Registrarse con el email invitado y aceptar en un solo paso ─
  async registerAndAcceptTransfer(token: string, fullName: string, password: string) {
    const transfer = await this.getValidPendingTransfer(token);

    const exists = await this.prisma.user.findUnique({ where: { email: transfer.toEmail } });
    if (exists) {
      throw new ConflictException('Ese email ya tiene una cuenta. Iniciá sesión para aceptar la entrada.');
    }

    const { user, accessToken, refreshToken } = await this.authService.register({
      email: transfer.toEmail,
      fullName,
      password,
    });

    await this.completeAcceptance(transfer.id, transfer.ticketId, transfer.fromUserId, transfer.toEmail, user.id);

    return { user, accessToken, refreshToken };
  }

  // ─── Helpers internos ────────────────────────────────────────────

  private async getValidPendingTransfer(token: string) {
    const transfer = await this.prisma.ticketTransfer.findUnique({
      where: { token },
      include: {
        ticket: { include: { event: true, category: true } },
        fromUser: { select: { fullName: true } },
      },
    });
    if (!transfer) throw new NotFoundException('Invitación no encontrada.');
    if (transfer.status !== TicketTransferStatus.PENDING) {
      throw new BadRequestException('Esta invitación ya no está disponible.');
    }
    if (transfer.expiresAt < new Date()) {
      await this.prisma.ticketTransfer.update({
        where: { id: transfer.id },
        data: { status: TicketTransferStatus.EXPIRED },
      });
      throw new BadRequestException('Esta invitación venció.');
    }
    return transfer;
  }

  private async completeAcceptance(
    transferId: string,
    ticketId: string,
    fromUserId: string,
    toEmail: string,
    newHolderUserId: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.ticket.update({ where: { id: ticketId }, data: { holderUserId: newHolderUserId } }),
      this.prisma.ticketTransfer.update({
        where: { id: transferId },
        data: { status: TicketTransferStatus.ACCEPTED, toUserId: newHolderUserId, acceptedAt: new Date() },
      }),
    ]);

    const [ticket, fromUser] = await Promise.all([
      this.prisma.ticket.findUnique({ where: { id: ticketId }, include: { event: true } }),
      this.prisma.user.findUnique({ where: { id: fromUserId } }),
    ]);
    if (ticket && fromUser) {
      this.mailService.sendTransferAccepted(fromUser.email, ticket.event.title, toEmail);
    }
  }
}
