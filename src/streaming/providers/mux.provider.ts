import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mux from '@mux/mux-node';
import type {
  IStreamingProvider,
  PlaybackResult,
  LiveStreamResult,
  WebhookEvent,
} from './streaming-provider.interface';

@Injectable()
export class MuxProvider implements IStreamingProvider {
  readonly providerType = 'mux' as const;
  private readonly logger = new Logger(MuxProvider.name);
  private readonly mux: Mux;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    this.mux = new Mux({
      tokenId: this.config.get<string>('mux.tokenId') ?? '',
      tokenSecret: this.config.get<string>('mux.tokenSecret') ?? '',
    });
    this.webhookSecret = this.config.get<string>('mux.webhookSecret') ?? '';
  }

  async createLiveStream(eventId: string): Promise<LiveStreamResult> {
    this.logger.log(`[Mux] Creando live stream para evento ${eventId}`);

    const liveStream = await this.mux.video.liveStreams.create({
      playback_policy: ['signed'],
      new_asset_settings: { playback_policy: ['signed'] },
    });

    return {
      streamId: liveStream.id ?? '',
      streamKey: liveStream.stream_key ?? undefined,
      ingestUrl: 'rtmps://global-live.mux.com:443/app',
      playbackId: liveStream.playback_ids?.[0]?.id ?? undefined,
      instructions:
        'Configurá OBS con RTMP URL + Stream Key. El playback se activa automáticamente al iniciar la emisión.',
    };
  }

  async getPlaybackToken(playbackId: string, ttlSeconds: number): Promise<PlaybackResult> {
    const token = await this.mux.jwt.signPlaybackId(playbackId, {
      type: 'video',
      expiration: `${ttlSeconds}s`,
    });

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    return {
      playbackUrl: `https://stream.mux.com/${playbackId}.m3u8?token=${token}`,
      providerType: 'mux',
      token,
      expiresAt,
      playbackId,
    };
  }

  async parseWebhook(body: unknown, signature: string): Promise<WebhookEvent> {
    // Verificar firma
    try {
      this.mux.webhooks.verifySignature(
        JSON.stringify(body),
        { 'mux-signature': signature },
        this.webhookSecret,
      );
    } catch {
      throw new BadRequestException('Firma de webhook Mux inválida.');
    }

    const data = body as Record<string, unknown>;
    const type = data.type as string;
    const payload = data.data as Record<string, string> | undefined;

    if (type === 'video.live_stream.active') {
      return { type: 'stream.active', streamId: payload?.id, raw: body };
    }
    if (type === 'video.live_stream.idle') {
      return { type: 'stream.idle', streamId: payload?.id, raw: body };
    }
    if (type === 'video.asset.ready') {
      return {
        type: 'asset.ready',
        assetId: payload?.id,
        playbackId: (payload?.playback_ids as unknown as Array<{ id: string }>)?.[0]?.id,
        raw: body,
      };
    }

    this.logger.debug(`[Mux] Webhook no manejado: ${type}`);
    return { type: 'unknown', raw: body };
  }
}
