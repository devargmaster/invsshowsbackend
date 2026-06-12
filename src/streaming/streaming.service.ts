import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { StreamingProviderFactory } from './providers/streaming-provider.factory';

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);
  private readonly signedUrlTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly providerFactory: StreamingProviderFactory,
  ) {
    this.signedUrlTtl = this.config.get<number>('mux.signedUrlTtl') ?? 3600;
  }

  /**
   * Obtiene token/URL de playback para un evento en vivo.
   * El proveedor es transparente para el caller — siempre devuelve PlaybackResult.
   */
  async getLiveStreamToken(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado.');
    if (!event.muxPlaybackId) {
      throw new BadRequestException('Este evento no tiene streaming configurado.');
    }
    if (!event.isLive) {
      throw new BadRequestException('El streaming de este evento aún no está activo.');
    }

    const provider = this.providerFactory.getProvider();
    return provider.getPlaybackToken(event.muxPlaybackId, this.signedUrlTtl);
  }

  /**
   * [Admin] Crear un nuevo live stream con el proveedor activo.
   */
  async createLiveStream(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado.');

    const provider = this.providerFactory.getProvider();
    const result = await provider.createLiveStream(eventId);

    // Persistir los IDs del proveedor en el evento
    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        muxLiveId: result.streamId,
        muxPlaybackId: result.playbackId ?? null,
        streamKey: result.streamKey ?? null,
        rtmpUrl: result.ingestUrl ?? null,
      },
    });

    this.logger.log(
      `Live stream creado con ${provider.providerType} para evento ${eventId}: ${result.streamId}`,
    );

    return {
      provider: provider.providerType,
      ...result,
    };
  }

  /**
   * Webhook del proveedor activo.
   * El controller pasa el body y la firma — el proveedor sabe cómo verificarla.
   */
  async handleWebhook(body: Record<string, unknown>, signature: string) {
    const provider = this.providerFactory.getProvider();
    const event = await provider.parseWebhook(body, signature);

    this.logger.log(`Webhook [${provider.providerType}]: ${event.type}`);

    switch (event.type) {
      case 'stream.active':
        if (event.streamId) {
          await this.prisma.event.updateMany({
            where: { muxLiveId: event.streamId },
            data: { isLive: true },
          });
          this.logger.log(`Stream activo: ${event.streamId}`);
        }
        break;

      case 'stream.idle':
        if (event.streamId) {
          await this.prisma.event.updateMany({
            where: { muxLiveId: event.streamId },
            data: { isLive: false },
          });
          this.logger.log(`Stream finalizado: ${event.streamId}`);
        }
        break;

      case 'asset.ready':
        this.logger.log(`Asset listo: ${event.assetId} (playbackId: ${event.playbackId})`);
        // TODO: crear Recording automáticamente cuando el live termina
        break;

      default:
        break;
    }

    return { received: true, provider: provider.providerType, type: event.type };
  }
}
