import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ManualLiveProvider } from '@prisma/client';
import { StreamingProviderFactory } from './providers/streaming-provider.factory';
import { extractYouTubeId } from '../common/utils/youtube.util';
import { extractTwitchChannel } from '../common/utils/twitch.util';

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

    // Live manual: el proveedor lo eligió el admin por evento (YouTube o
    // Twitch), independiente del STREAMING_PROVIDER global. Sin
    // manualLiveProvider, es un live "real" (Mux) y se usa el activo.
    const provider = event.manualLiveProvider
      ? this.providerFactory.getByType(event.manualLiveProvider.toLowerCase() as 'youtube' | 'twitch')
      : this.providerFactory.getProvider();

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
   * [Admin] Poner en vivo (o cortar) un evento a mano, sin pasar por un
   * proveedor con API de creación de streams (ej. YouTube o Twitch,
   * mientras Mux esté en el plan free que no permite live). Reutiliza
   * muxPlaybackId como "el ID que el proveedor de este live manual
   * necesita para reproducir" — mismo campo, sin importar cuál sea.
   */
  async setManualLive(eventId: string, provider?: ManualLiveProvider, videoUrl?: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado.');

    if (!videoUrl) {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { isLive: false, manualLiveStartedAt: null, manualLiveProvider: null },
      });
      this.logger.log(`Live manual cortado para evento ${eventId}`);
      return { isLive: false };
    }

    if (!provider) {
      throw new BadRequestException('Falta indicar el proveedor del live manual (YOUTUBE o TWITCH).');
    }

    const playbackId =
      provider === ManualLiveProvider.TWITCH ? extractTwitchChannel(videoUrl) : extractYouTubeId(videoUrl);

    if (!playbackId) {
      throw new BadRequestException(
        provider === ManualLiveProvider.TWITCH
          ? 'No se pudo extraer un canal de Twitch de eso. Pegá el link (twitch.tv/tu_canal) o el nombre del canal directo.'
          : 'No se pudo extraer un ID de YouTube de esa URL.',
      );
    }

    await this.prisma.event.update({
      where: { id: eventId },
      data: { muxPlaybackId: playbackId, isLive: true, manualLiveStartedAt: new Date(), manualLiveProvider: provider },
    });
    this.logger.log(`Live manual (${provider}) activado para evento ${eventId}: ${playbackId}`);
    return { isLive: true, playbackId, provider };
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
