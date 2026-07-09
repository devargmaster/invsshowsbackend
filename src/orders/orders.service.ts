import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, ConflictException, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PaymentProviderFactory } from '../payments/providers/payment-provider.factory';
import { CreateOrderDto } from './dto/create-order.dto';
import { PayCardDto } from './dto/pay-card.dto';
import { ValidateTransferDto } from './dto/validate-transfer.dto';
import { OrderStatus, PaymentMethod, TicketStatus, Prisma } from '@prisma/client';
import { buildQrPayload } from '../common/utils/qr-signer.util';

export interface OrderFilters {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly hmacSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
    private readonly paymentFactory: PaymentProviderFactory,
  ) {
    this.hmacSecret = this.config.get<string>('qr.hmacSecret') ?? '';
  }

  // ─── Datos bancarios para mostrar en el checkout (público) ──────
  getBankTransferInfo() {
    return {
      bankName: this.config.get<string>('bankTransfer.bankName'),
      accountHolder: this.config.get<string>('bankTransfer.accountHolder'),
      cbu: this.config.get<string>('bankTransfer.cbu'),
      alias: this.config.get<string>('bankTransfer.alias'),
      cuit: this.config.get<string>('bankTransfer.cuit'),
    };
  }

  // ─── Crear orden: reserva capacidad de forma atómica ────────────
  async create(buyerId: string, dto: CreateOrderDto) {
    const event = await this.prisma.event.findUnique({ where: { id: dto.eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado.');

    const categoryIds = [...new Set(dto.items.map((i) => i.categoryId))];
    const categories = await this.prisma.ticketCategory.findMany({
      where: { id: { in: categoryIds }, eventId: dto.eventId, isActive: true },
    });
    if (categories.length !== categoryIds.length) {
      throw new BadRequestException('Una o más categorías no son válidas para este evento.');
    }
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const addonItems = dto.addons ?? [];
    const addonIds = [...new Set(addonItems.map((a) => a.addonId))];
    const addonsData = addonIds.length
      ? await this.prisma.addOn.findMany({
          where: { id: { in: addonIds }, eventId: dto.eventId, isActive: true },
          include: { variants: true },
        })
      : [];
    const addonMap = new Map(addonsData.map((a) => [a.id, a]));

    // Calcular totales y validar variantes
    let subtotalCents = 0;
    for (const item of dto.items) {
      const category = categoryMap.get(item.categoryId);
      if (!category) throw new BadRequestException(`Categoría ${item.categoryId} no válida.`);
      subtotalCents += category.priceCents * item.quantity;
    }

    const resolvedAddons: Array<{
      addonId: string;
      variantId: string | null;
      quantity: number;
      unitPriceCents: number;
    }> = [];
    for (const a of addonItems) {
      const addon = addonMap.get(a.addonId);
      if (!addon) throw new BadRequestException(`Adicional ${a.addonId} no válido.`);
      if (addon.hasVariants) {
        const validVariant = a.variantId && addon.variants.some((v) => v.id === a.variantId);
        if (!validVariant) {
          throw new BadRequestException(`Elegí una variante válida para "${addon.name}".`);
        }
      }
      subtotalCents += addon.priceCents * a.quantity;
      resolvedAddons.push({
        addonId: a.addonId,
        variantId: a.variantId ?? null,
        quantity: a.quantity,
        unitPriceCents: addon.priceCents,
      });
    }

    const totalCents = subtotalCents;

    const ttlMs =
      dto.paymentMethod === PaymentMethod.CARD_OPENPAY
        ? (this.config.get<number>('orders.cardTtlMinutes') ?? 15) * 60_000
        : (this.config.get<number>('orders.transferTtlHours') ?? 72) * 3_600_000;
    const expiresAt = new Date(Date.now() + ttlMs);

    return this.prisma.$transaction(async (tx) => {
      // Reserva atómica de capacidad, categoría por categoría. Si una sola
      // categoría no tiene cupo, se aborta TODA la transacción (rollback
      // automático de las reservas ya hechas en este mismo loop).
      for (const item of dto.items) {
        const affected = await tx.$executeRaw`
          UPDATE ticket_categories
          SET "reservedCount" = "reservedCount" + ${item.quantity}
          WHERE id = ${item.categoryId} AND "reservedCount" + ${item.quantity} <= "maxCapacity"
        `;
        if (affected === 0) {
          throw new BadRequestException(
            `No hay disponibilidad suficiente en "${categoryMap.get(item.categoryId)?.name}".`,
          );
        }
      }

      const order = await tx.order.create({
        data: {
          buyerId,
          eventId: dto.eventId,
          paymentMethod: dto.paymentMethod,
          subtotalCents,
          totalCents,
          expiresAt,
          addons: resolvedAddons.length
            ? {
                create: resolvedAddons.map((a) => ({
                  addonId: a.addonId,
                  variantId: a.variantId,
                  quantity: a.quantity,
                  unitPriceCents: a.unitPriceCents,
                })),
              }
            : undefined,
        },
      });

      // Un ticket por cada unidad de cada categoría. El PRIMER ticket de la
      // orden queda auto-asignado al comprador; el resto sin asignar (para
      // que los pueda compartir de a uno desde "Mis Entradas").
      const ticketsData: Prisma.TicketCreateManyInput[] = [];
      let firstAssigned = false;
      for (const item of dto.items) {
        for (let i = 0; i < item.quantity; i++) {
          ticketsData.push({
            orderId: order.id,
            categoryId: item.categoryId,
            eventId: dto.eventId,
            purchaserUserId: buyerId,
            holderUserId: !firstAssigned ? buyerId : null,
          });
          firstAssigned = true;
        }
      }
      await tx.ticket.createMany({ data: ticketsData });

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { tickets: true, addons: true },
      });
    });
  }

  // ─── Pagar con tarjeta (Openpay) ─────────────────────────────────
  async payCard(orderId: string, buyerId: string, dto: PayCardDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { buyer: true, event: true },
    });
    if (!order) throw new NotFoundException('Orden no encontrada.');
    if (order.buyerId !== buyerId) throw new ForbiddenException('No podés pagar una orden que no es tuya.');
    if (order.paymentMethod !== PaymentMethod.CARD_OPENPAY) {
      throw new BadRequestException('Esta orden no es de pago con tarjeta.');
    }
    if (order.status === OrderStatus.PAID) throw new ConflictException('Esta orden ya fue pagada.');
    if (order.status === OrderStatus.CANCELLED) throw new BadRequestException('Esta orden fue cancelada.');
    if (order.expiresAt && order.expiresAt < new Date()) {
      throw new BadRequestException('La orden venció, iniciá una compra nueva.');
    }

    const result = await this.paymentFactory.getProvider().charge({
      orderId: order.id,
      amountCents: order.totalCents,
      currency: order.currency,
      cardToken: dto.cardToken,
      deviceSessionId: dto.deviceSessionId,
      customerEmail: order.buyer.email,
      customerName: order.buyer.fullName,
      description: `INVS - ${order.event.title}`,
    });

    if (!result.success) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.FAILED, paymentError: result.errorMessage },
      });
      throw new BadRequestException(result.errorMessage ?? 'El pago fue rechazado.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID, openpayChargeId: result.chargeId, paidAt: new Date() },
      });
      await this.activateOrderTickets(tx, order.id, order.event.date);
    });

    const ticketCount = await this.prisma.ticket.count({ where: { orderId: order.id } });
    this.mailService.sendOrderConfirmation(order.buyer.email, order.event.title, ticketCount);

    return this.findOne(order.id, { id: buyerId, role: 'USER' });
  }

  // ─── Subir comprobante de transferencia ─────────────────────────
  async uploadTransferProof(orderId: string, buyerId: string, fileUrl: string, reference?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Orden no encontrada.');
    if (order.buyerId !== buyerId) throw new ForbiddenException();
    if (order.paymentMethod !== PaymentMethod.BANK_TRANSFER) {
      throw new BadRequestException('Esta orden no es por transferencia.');
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Esta orden ya no está pendiente de pago.');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { transferProofUrl: fileUrl, transferReference: reference },
    });
  }

  // ─── Admin: validar (aprobar/rechazar) una transferencia ────────
  async validateTransfer(orderId: string, adminId: string, dto: ValidateTransferDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { buyer: true, event: true },
    });
    if (!order) throw new NotFoundException('Orden no encontrada.');
    if (order.paymentMethod !== PaymentMethod.BANK_TRANSFER) {
      throw new BadRequestException('Esta orden no es por transferencia.');
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new ConflictException('Esta orden ya fue procesada.');
    }

    if (dto.approve) {
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.PAID,
            validatedByUserId: adminId,
            validatedAt: new Date(),
            paidAt: new Date(),
          },
        });
        await this.activateOrderTickets(tx, orderId, order.event.date);
      });
      this.mailService.sendTransferOrderApproved(order.buyer.email, order.event.title);
    } else {
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.CANCELLED,
            validatedByUserId: adminId,
            validatedAt: new Date(),
            rejectionReason: dto.rejectionReason,
          },
        });
        await this.releaseOrderCapacity(tx, orderId);
        await tx.ticket.updateMany({ where: { orderId }, data: { status: TicketStatus.CANCELLED } });
      });
      this.mailService.sendTransferOrderRejected(order.buyer.email, order.event.title, dto.rejectionReason);
    }

    return this.findOne(orderId, { id: adminId, role: 'ADMIN' });
  }

  // ─── Consultas ───────────────────────────────────────────────────
  async findMyOrders(buyerId: string) {
    return this.prisma.order.findMany({
      where: { buyerId },
      include: { tickets: true, addons: { include: { addon: true, variant: true } }, event: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, requestingUser: { id: string; role: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { tickets: true, addons: { include: { addon: true, variant: true } }, event: true },
    });
    if (!order) throw new NotFoundException('Orden no encontrada.');
    const isOwner = order.buyerId === requestingUser.id;
    const isStaff = requestingUser.role === 'ADMIN' || requestingUser.role === 'STAFF';
    if (!isOwner && !isStaff) throw new ForbiddenException('No podés ver esta orden.');
    return order;
  }

  // ── Admin: listar (ej. cola de transferencias pendientes) ───────
  async findAllAdmin(filters: OrderFilters) {
    return this.prisma.order.findMany({
      where: {
        status: filters.status,
        paymentMethod: filters.paymentMethod,
      },
      include: { buyer: { select: { email: true, fullName: true } }, event: true, tickets: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Helpers internos ────────────────────────────────────────────

  private async activateOrderTickets(tx: Prisma.TransactionClient, orderId: string, eventDate: Date) {
    const tickets = await tx.ticket.findMany({ where: { orderId } });
    const expiresAt = new Date(eventDate.getTime() + 4 * 60 * 60 * 1000);

    for (const ticket of tickets) {
      const issuedAt = Date.now();
      const qrPayload = buildQrPayload(
        {
          ticketId: ticket.id,
          eventId: ticket.eventId,
          categoryId: ticket.categoryId,
          issuedAt,
          expiresAt: expiresAt.getTime(),
        },
        this.hmacSecret,
      );
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.ACTIVE, qrPayload, expiresAt },
      });
    }
  }

  /** Libera el cupo reservado por una orden (usado al cancelar/rechazar/expirar). */
  async releaseOrderCapacity(tx: Prisma.TransactionClient, orderId: string) {
    const tickets = await tx.ticket.groupBy({
      by: ['categoryId'],
      where: { orderId, status: { not: TicketStatus.CANCELLED } },
      _count: { id: true },
    });
    for (const group of tickets) {
      await tx.$executeRaw`
        UPDATE ticket_categories
        SET "reservedCount" = GREATEST("reservedCount" - ${group._count.id}, 0)
        WHERE id = ${group.categoryId}
      `;
    }
  }
}
