import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { OrdersService } from '../orders/orders.service';
import { CreateAccessRequestDto } from './dto/create-access-request.dto';
import { ApproveAccessRequestDto } from './dto/approve-access-request.dto';
import { RejectAccessRequestDto } from './dto/reject-access-request.dto';
import { AccessRequestStatus, OrderStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class AccessRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly ordersService: OrdersService,
  ) {}

  async create(userId: string, dto: CreateAccessRequestDto) {
    const event = await this.prisma.event.findUnique({ where: { id: dto.eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado.');

    // No bloqueamos reintentos: si una solicitud anterior fue rechazada, se
    // puede volver a pedir. Sí evitamos duplicar una que ya está pendiente
    // o ya fue aprobada.
    const existing = await this.prisma.accessRequest.findFirst({
      where: { eventId: dto.eventId, userId, status: { in: [AccessRequestStatus.PENDING, AccessRequestStatus.APPROVED] } },
    });
    if (existing) return existing;

    return this.prisma.accessRequest.create({
      data: { eventId: dto.eventId, userId, code: dto.code, note: dto.note },
    });
  }

  /** El propio usuario: estado de su solicitud para un evento puntual (o null si nunca pidió). */
  async findMine(userId: string, eventId: string) {
    return this.prisma.accessRequest.findFirst({
      where: { eventId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin(status?: AccessRequestStatus) {
    return this.prisma.accessRequest.findMany({
      where: { status },
      include: {
        event: { select: { id: true, title: true, date: true } },
        user: { select: { id: true, email: true, fullName: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(requestId: string, adminId: string, dto: ApproveAccessRequestDto) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id: requestId },
      include: { event: true, user: true },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada.');
    if (request.status !== AccessRequestStatus.PENDING) {
      throw new ConflictException('Esta solicitud ya fue procesada.');
    }

    const category = await this.prisma.ticketCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category || category.eventId !== request.eventId) {
      throw new BadRequestException('La categoría elegida no es válida para este evento.');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const affected = await tx.$executeRaw`
        UPDATE ticket_categories
        SET "reservedCount" = "reservedCount" + 1
        WHERE id = ${dto.categoryId} AND "reservedCount" + 1 <= "maxCapacity"
      `;
      if (affected === 0) {
        throw new BadRequestException(`No hay disponibilidad en "${category.name}" para acreditar a esta persona.`);
      }

      const order = await tx.order.create({
        data: {
          buyerId: request.userId,
          eventId: request.eventId,
          paymentMethod: PaymentMethod.FREE,
          status: OrderStatus.PAID,
          subtotalCents: 0,
          totalCents: 0,
          paidAt: new Date(),
          validatedByUserId: adminId,
          validatedAt: new Date(),
        },
      });

      await tx.ticket.create({
        data: {
          orderId: order.id,
          categoryId: dto.categoryId,
          eventId: request.eventId,
          purchaserUserId: request.userId,
          holderUserId: request.userId,
        },
      });

      await this.ordersService.activateOrderTickets(tx, order.id, request.event.date);

      await tx.accessRequest.update({
        where: { id: requestId },
        data: {
          status: AccessRequestStatus.APPROVED,
          categoryId: dto.categoryId,
          orderId: order.id,
          reviewedByUserId: adminId,
          reviewedAt: new Date(),
        },
      });

      return order;
    });

    this.mailService.sendAccessRequestApproved(request.user.email, request.event.title);
    return this.prisma.accessRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { order: { include: { tickets: true } } },
    });
  }

  async reject(requestId: string, adminId: string, dto: RejectAccessRequestDto) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id: requestId },
      include: { event: true, user: true },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada.');
    if (request.status !== AccessRequestStatus.PENDING) {
      throw new ConflictException('Esta solicitud ya fue procesada.');
    }

    const updated = await this.prisma.accessRequest.update({
      where: { id: requestId },
      data: {
        status: AccessRequestStatus.REJECTED,
        reviewedByUserId: adminId,
        reviewedAt: new Date(),
        rejectionReason: dto.reason,
      },
    });

    this.mailService.sendAccessRequestRejected(request.user.email, request.event.title, dto.reason);
    return updated;
  }
}
