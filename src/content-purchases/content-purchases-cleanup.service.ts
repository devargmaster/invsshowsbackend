import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

/**
 * Cancela compras de contenido PENDING_PAYMENT vencidas. No hay cupo que
 * liberar (a diferencia de OrdersCleanupService) — el único efecto es
 * marcarlas CANCELLED para que dejen de aparecer como pendientes.
 */
@Injectable()
export class ContentPurchasesCleanupService {
  private readonly logger = new Logger(ContentPurchasesCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredPurchases() {
    const result = await this.prisma.contentPurchase.updateMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        expiresAt: { lt: new Date() },
      },
      data: { status: OrderStatus.CANCELLED },
    });

    if (result.count > 0) {
      this.logger.log(`Canceladas ${result.count} compra(s) de contenido vencida(s).`);
    }
  }
}
