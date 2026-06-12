/**
 * Contrato que deben implementar todos los proveedores de streaming.
 * Agregar un nuevo proveedor = crear una clase que implemente esta interfaz
 * y registrarla en StreamingProviderFactory.
 */

export type ProviderType = 'mux' | 'youtube' | 'vimeo';

export interface PlaybackResult {
  /** URL HLS (.m3u8) para Mux/Vimeo, o URL de embed para YouTube */
  playbackUrl: string;
  /** Tipo de proveedor — el cliente usa esto para elegir el player correcto */
  providerType: ProviderType;
  /** Token JWT de Mux (solo para proveedores que lo usan) */
  token?: string;
  /** Cuándo vence el token/URL */
  expiresAt?: Date;
  /** ID del playback en el proveedor (útil para debugging) */
  playbackId?: string;
}

export interface LiveStreamResult {
  /** ID interno del stream en el proveedor */
  streamId: string;
  /** Clave RTMP para OBS/vMix */
  streamKey?: string;
  /** URL de ingest RTMP */
  ingestUrl?: string;
  /** ID de playback para generar URLs después */
  playbackId?: string;
  /** Instrucciones para el operador */
  instructions: string;
}

export interface WebhookEvent {
  type: 'stream.active' | 'stream.idle' | 'asset.ready' | 'unknown';
  streamId?: string;
  assetId?: string;
  playbackId?: string;
  raw: unknown;
}

export interface IStreamingProvider {
  readonly providerType: ProviderType;

  /**
   * Crear un nuevo live stream en el proveedor.
   * @param eventId ID interno del evento en INVS
   */
  createLiveStream(eventId: string): Promise<LiveStreamResult>;

  /**
   * Obtener URL/token de playback para un stream en vivo o grabación.
   * @param playbackId ID de playback almacenado en el evento/grabación
   * @param ttlSeconds Tiempo de vida del token en segundos
   */
  getPlaybackToken(playbackId: string, ttlSeconds: number): Promise<PlaybackResult>;

  /**
   * Verificar y parsear un webhook entrante del proveedor.
   * @param body Cuerpo del request
   * @param signature Header de firma del proveedor
   */
  parseWebhook(body: unknown, signature: string): Promise<WebhookEvent>;
}
