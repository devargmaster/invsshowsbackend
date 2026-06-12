import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  IStreamingProvider,
  PlaybackResult,
  LiveStreamResult,
  WebhookEvent,
} from './streaming-provider.interface';

/**
 * YouTubeProvider — stub listo para implementar cuando INVS lo necesite.
 *
 * YouTube no tiene una API de streaming tan integrada como Mux, pero
 * el flujo sería:
 *
 * Live:
 * 1. Crear un live broadcast en YouTube Studio o via YouTube Data API v3
 * 2. Obtener el rtmpIngestionAddress + streamKey
 * 3. El playbackUrl para el frontend sería una URL de embed de YouTube
 *    (youtube.com/embed/{videoId}) o la URL de watch
 *
 * VOD:
 * 1. El video queda grabado automáticamente en YouTube
 * 2. Se obtiene el videoId y se genera la URL de embed
 *
 * Notas importantes:
 * - YouTube no tiene signed URLs → el control de acceso debe ser por listing
 *   (videos sin listar = solo accesibles con el link exacto)
 * - No hay TTL nativo → la "expiración" la maneja INVS con lógica propia
 * - El frontend necesita usar WebView en lugar de HLS player para YouTube
 *   (ver StreamPlayer.tsx — ya detecta providerType === 'youtube')
 *
 * Variables de entorno a agregar cuando se implemente:
 * YOUTUBE_CLIENT_ID=...
 * YOUTUBE_CLIENT_SECRET=...
 * YOUTUBE_REFRESH_TOKEN=...  (OAuth2 del canal de INVS)
 * YOUTUBE_CHANNEL_ID=...
 */
@Injectable()
export class YouTubeProvider implements IStreamingProvider {
  readonly providerType = 'youtube' as const;
  private readonly logger = new Logger(YouTubeProvider.name);

  constructor(private readonly config: ConfigService) {
    this.logger.log('YouTubeProvider inicializado (modo stub — implementación pendiente)');
  }

  async createLiveStream(eventId: string): Promise<LiveStreamResult> {
    /**
     * TODO: Implementar con YouTube Data API v3
     *
     * const auth = await getYouTubeOAuthClient();
     * const youtube = google.youtube({ version: 'v3', auth });
     *
     * const broadcast = await youtube.liveBroadcasts.insert({...});
     * const stream = await youtube.liveStreams.insert({...});
     * await youtube.liveBroadcasts.bind({...});
     *
     * return {
     *   streamId: broadcast.data.id,
     *   streamKey: stream.data.cdn.ingestionInfo.streamName,
     *   ingestUrl: stream.data.cdn.ingestionInfo.ingestionAddress,
     *   playbackId: broadcast.data.id,  // videoId de YouTube
     *   instructions: 'Configurá OBS con el stream key de YouTube Studio.',
     * };
     */
    this.logger.warn(`[YouTube] createLiveStream llamado para evento ${eventId} — no implementado`);
    throw new NotImplementedException(
      'YouTubeProvider.createLiveStream no está implementado todavía. ' +
      'Cambiá STREAMING_PROVIDER=mux para usar Mux.',
    );
  }

  async getPlaybackToken(playbackId: string, _ttlSeconds: number): Promise<PlaybackResult> {
    /**
     * TODO: Para YouTube, "playbackId" es el videoId (ej: "dQw4w9WgXcQ")
     *
     * No hay token firmado — simplemente construir la URL de embed:
     * https://www.youtube.com/embed/{videoId}
     *
     * Para live streams, agregar ?autoplay=1
     * Para VOD, agregar parámetros de privacidad si el video es "unlisted"
     */
    this.logger.log(`[YouTube] Generando URL de embed para playbackId: ${playbackId}`);

    // URL de embed de YouTube — sin token, el acceso lo controla YouTube
    const embedUrl = `https://www.youtube.com/embed/${playbackId}?rel=0&modestbranding=1`;

    return {
      playbackUrl: embedUrl,
      providerType: 'youtube',
      // Sin token ni expiresAt — YouTube no usa signed URLs
      playbackId,
    };
  }

  async parseWebhook(body: unknown, _signature: string): Promise<WebhookEvent> {
    /**
     * TODO: YouTube usa notificaciones vía PubSubHubbub (WebSub)
     * para cambios de estado de broadcasts.
     *
     * También se puede implementar polling periódico al
     * liveBroadcasts.list API para detectar cambios de estado.
     */
    this.logger.warn('[YouTube] parseWebhook no implementado — usando polling manualmente');
    return { type: 'unknown', raw: body };
  }
}
