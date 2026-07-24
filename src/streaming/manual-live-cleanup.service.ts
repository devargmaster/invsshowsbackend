import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Corta el live manual (YouTube) de eventos que nadie apagó a mano — no hay
 * forma de saber si el YouTube Live realmente sigue en vivo sin implementar
 * la API de YouTube (ver YouTubeProvider), así que esto es la salvaguarda
 * para que "EN VIVO" no quede pegado para siempre. Solo afecta eventos con
 * live manual (muxLiveId null); un live real de Mux lo apaga su webhook.
 */
@Injectable()
export class ManualLiveCleanupService {
  private readonly logger = new Logger(ManualLiveCleanupService.name);
  private readonly ttlHours: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.ttlHours = this.config.get<number>('streaming.manualLiveTtlHours') ?? 6;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async cutoffStaleManualLives() {
    const cutoff = new Date(Date.now() - this.ttlHours * 60 * 60 * 1000);

    const stale = await this.prisma.event.findMany({
      where: { isLive: true, muxLiveId: null, manualLiveStartedAt: { lt: cutoff } },
      select: { id: true },
    });

    if (stale.length === 0) return;

    this.logger.log(`Cortando ${stale.length} live(s) manual(es) sin actividad hace más de ${this.ttlHours}h...`);

    await this.prisma.event.updateMany({
      where: { id: { in: stale.map((e) => e.id) } },
      data: { isLive: false, manualLiveStartedAt: null },
    });
  }
}
