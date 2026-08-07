import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MuxProvider } from './mux.provider';
import { YouTubeProvider } from './youtube.provider';
import { TwitchProvider } from './twitch.provider';
import type { IStreamingProvider, ProviderType } from './streaming-provider.interface';

/**
 * Factory que devuelve el proveedor de streaming activo según la variable
 * de entorno STREAMING_PROVIDER.
 *
 * Para cambiar de Mux a YouTube:
 *   1. Cambiar STREAMING_PROVIDER=youtube en .env (o en Railway)
 *   2. Completar la implementación de YouTubeProvider
 *   3. Sin tocar ningún otro archivo del sistema
 */
@Injectable()
export class StreamingProviderFactory {
  private readonly logger = new Logger(StreamingProviderFactory.name);
  private readonly provider: IStreamingProvider;

  constructor(
    private readonly config: ConfigService,
    private readonly muxProvider: MuxProvider,
    private readonly youtubeProvider: YouTubeProvider,
    private readonly twitchProvider: TwitchProvider,
  ) {
    const selected = (
      this.config.get<string>('streaming.provider') ?? 'mux'
    ).toLowerCase() as ProviderType;

    switch (selected) {
      case 'youtube':
        this.provider = this.youtubeProvider;
        break;
      case 'mux':
      default:
        this.provider = this.muxProvider;
        break;
    }

    this.logger.log(`Proveedor de streaming activo: ${this.provider.providerType.toUpperCase()}`);
  }

  getProvider(): IStreamingProvider {
    return this.provider;
  }

  /**
   * Devuelve un proveedor puntual por nombre, sin pasar por STREAMING_PROVIDER
   * — lo usa el live manual (ver StreamingService), donde el proveedor lo
   * elige el admin por evento (YouTube o Twitch), no la config global.
   */
  getByType(type: Extract<ProviderType, 'youtube' | 'twitch'>): IStreamingProvider {
    return type === 'twitch' ? this.twitchProvider : this.youtubeProvider;
  }
}
