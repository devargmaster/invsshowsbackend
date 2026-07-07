import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, TicketStatus } from '@prisma/client';
import { OrdersService } from './orders.service';

/**
 * Cancela órdenes PENDING_PAYMENT vencidas (Order.expiresAt < ahora) y libera
 * el cupo de categoría que tenían reservado. Corre cada 5 minutos.
 */
@Injectable()
export class OrdersCleanupService {
  private readonly logger = new Logger(OrdersCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredOrders() {
    const expired = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        expiresAt: { lt: new Date() },
      },
      select: { id: true },
    });

    if (expired.length === 0) return;

    this.logger.log(`Liberando ${expired.length} orden(es) vencida(s)...`);

    for (const { id } of expired) {
      await this.prisma.$transaction(async (tx) => {
        await this.ordersService.releaseOrderCapacity(tx, id);
        await tx.ticket.updateMany({ where: { orderId: id }, data: { status: TicketStatus.CANCELLED } });
        await tx.order.update({ where: { id }, data: { status: OrderStatus.CANCELLED } });
      });
    }
  }
}
