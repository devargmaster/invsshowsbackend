import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import type {
  IStreamingProvider,
  PlaybackResult,
  LiveStreamResult,
  WebhookEvent,
} from './streaming-provider.interface';

/**
 * TwitchProvider — solo cubre el caso de "live manual" (ver
 * StreamingService.setManualLive): el admin ya transmite con su propia
 * cuenta de Twitch desde OBS, e INVS solo necesita embeber el reproductor
 * apuntando a ese canal. No hay creación de stream vía API — a diferencia
 * de Mux, Twitch no ofrece eso para apps de terceros.
 *
 * Notas importantes:
 * - Igual que YouTube, no hay signed URLs: el control de acceso es "quién
 *   puede cargar la página de INVS", no el link de Twitch en sí — alguien
 *   con el link del embed podría verlo sin pagar.
 * - El embed de Twitch exige un parámetro `parent` con el hostname exacto
 *   que sirve la página en ese momento (localhost en dev, el dominio de
 *   Vercel en prod). El backend no puede saber ese hostname de antemano,
 *   así que NO lo agrega acá — lo agrega invs-web al armar el iframe
 *   (ver StreamPlayer.tsx), usando window.location.hostname.
 */
@Injectable()
export class TwitchProvider implements IStreamingProvider {
  readonly providerType = 'twitch' as const;
  private readonly logger = new Logger(TwitchProvider.name);

  async createLiveStream(eventId: string): Promise<LiveStreamResult> {
    this.logger.warn(`[Twitch] createLiveStream llamado para evento ${eventId} — no soportado`);
    throw new NotImplementedException(
      'Twitch no tiene API de creación de stream para apps de terceros. ' +
      'Usá el live manual (POST /streaming/:eventId/manual-live con provider=TWITCH) ' +
      'con el canal de Twitch donde ya vas a transmitir desde OBS.',
    );
  }

  async getPlaybackToken(playbackId: string, _ttlSeconds: number): Promise<PlaybackResult> {
    // playbackId acá es el nombre del canal de Twitch (ej: "estudiospanda")
    this.logger.log(`[Twitch] Generando URL de embed para el canal: ${playbackId}`);

    const embedUrl = `https://player.twitch.tv/?channel=${encodeURIComponent(playbackId)}`;

    return {
      playbackUrl: embedUrl,
      providerType: 'twitch',
      playbackId,
    };
  }

  async parseWebhook(body: unknown, _signature: string): Promise<WebhookEvent> {
    this.logger.warn('[Twitch] parseWebhook no implementado — el live manual se corta por TTL, no por webhook');
    return { type: 'unknown', raw: body };
  }
}
