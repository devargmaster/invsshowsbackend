import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

/**
 * Cancela compras de Tienda PENDING_PAYMENT vencidas. No hay stock que
 * liberar de forma atómica (a diferencia de OrdersCleanupService, ver nota
 * en addons.service.ts: reservedStock existe en el schema pero no se
 * enforcea todavía) — el único efecto es marcarlas CANCELLED.
 */
@Injectable()
export class StorePurchasesCleanupService {
  private readonly logger = new Logger(StorePurchasesCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredPurchases() {
    const result = await this.prisma.storePurchase.updateMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        expiresAt: { lt: new Date() },
      },
      data: { status: OrderStatus.CANCELLED },
    });

    if (result.count > 0) {
      this.logger.log(`Canceladas ${result.count} compra(s) de Tienda vencida(s).`);
    }
  }
}
