import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ContentAccessService } from '../common/services/content-access.service';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto';
import Mux from '@mux/mux-node';

/** Extrae el ID de un video de YouTube de sus formatos de URL comunes. */
function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

@Injectable()
export class RecordingsService {
  private readonly mux: Mux;
  private readonly signedUrlTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly contentAccess: ContentAccessService,
  ) {
    this.mux = new Mux({
      tokenId: this.config.get<string>('mux.tokenId') ?? '',
      tokenSecret: this.config.get<string>('mux.tokenSecret') ?? '',
    });
    this.signedUrlTtl = this.config.get<number>('mux.signedUrlTtl') ?? 3600;
  }

  /**
   * Listado para el Hub de streaming — cualquier usuario logueado puede
   * VER el catálogo (el guard de acceso real solo aplica al endpoint de
   * token, que reproduce el contenido). Cada item trae `granted` +
   * `availableAccess` calculado para el usuario que pide el listado, así
   * el frontend pinta el botón correcto sin pegarle al endpoint de token.
   */
  async findAllForUser(userId: string) {
    const recordings = await this.prisma.recording.findMany({
      orderBy: { createdAt: 'desc' },
      include: { event: { select: { id: true, title: true, date: true } } },
    });
    return Promise.all(
      recordings.map(async (r) => ({
        ...r,
        ...(await this.contentAccess.checkRecordingAccess(userId, r)),
      })),
    );
  }

  /** Grabaciones de un evento específico, con el mismo acceso calculado. */
  async findByEventId(eventId: string, userId: string) {
    const recordings = await this.prisma.recording.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(
      recordings.map(async (r) => ({
        ...r,
        ...(await this.contentAccess.checkRecordingAccess(userId, r)),
      })),
    );
  }

  /**
   * Resuelve la reproducción según la fuente del video:
   * - videoUrl (ej. YouTube): devuelve la URL de embed + providerType para
   *   que StreamPlayer renderice el iframe/WebView — sin tokens.
   * - Mux: genera un token de playback temporal (signed JWT).
   * El control de acceso ya lo hizo ContentAccessGuard antes de llegar acá.
   */
  async getPlaybackToken(recordingId: string) {
    const recording = await this.prisma.recording.findUnique({
      where: { id: recordingId },
    });
    if (!recording) throw new NotFoundException('Grabación no encontrada.');

    if (recording.videoUrl) {
      const youtubeId = extractYouTubeId(recording.videoUrl);
      return {
        playbackId: youtubeId ?? recording.videoUrl,
        playbackUrl: youtubeId
          ? `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`
          : recording.videoUrl,
        providerType: youtubeId ? ('youtube' as const) : ('external' as const),
        thumbnailUrl:
          recording.thumbnailUrl ??
          (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null),
      };
    }

    if (!recording.muxPlaybackId) {
      throw new BadRequestException('Esta grabación no tiene una fuente de video configurada.');
    }

    const token = await this.mux.jwt.signPlaybackId(recording.muxPlaybackId, {
      type: 'video',
      expiration: `${this.signedUrlTtl}s`,
    });

    return {
      playbackId: recording.muxPlaybackId,
      token,
      providerType: 'mux' as const,
      hlsUrl: `https://stream.mux.com/${recording.muxPlaybackId}.m3u8?token=${token}`,
      playbackUrl: `https://stream.mux.com/${recording.muxPlaybackId}.m3u8?token=${token}`,
      thumbnailUrl: `https://image.mux.com/${recording.muxPlaybackId}/thumbnail.jpg`,
    };
  }

  async create(dto: CreateRecordingDto) {
    this.assertHasVideoSource(dto.videoUrl, dto.muxAssetId, dto.muxPlaybackId);
    return this.prisma.recording.create({ data: this.withAutoThumbnail(dto) });
  }

  async update(id: string, dto: UpdateRecordingDto) {
    const recording = await this.prisma.recording.findUnique({ where: { id } });
    if (!recording) throw new NotFoundException('Grabación no encontrada.');
    // Validar la fuente resultante después de aplicar los cambios
    const merged = { ...recording, ...dto };
    this.assertHasVideoSource(merged.videoUrl, merged.muxAssetId, merged.muxPlaybackId);
    return this.prisma.recording.update({ where: { id }, data: this.withAutoThumbnail(dto) });
  }

  /** Toda grabación necesita una fuente: URL externa o el par de IDs de Mux. */
  private assertHasVideoSource(
    videoUrl?: string | null,
    muxAssetId?: string | null,
    muxPlaybackId?: string | null,
  ) {
    if (!videoUrl && !(muxAssetId && muxPlaybackId)) {
      throw new BadRequestException(
        'La grabación necesita una fuente de video: una URL (ej. YouTube) o los IDs de Mux (Asset + Playback).',
      );
    }
  }

  /** Si es un video de YouTube sin thumbnail propio, usa el de YouTube. */
  private withAutoThumbnail<T extends { videoUrl?: string | null; thumbnailUrl?: string | null }>(dto: T): T {
    if (dto.videoUrl && !dto.thumbnailUrl) {
      const youtubeId = extractYouTubeId(dto.videoUrl);
      if (youtubeId) {
        return { ...dto, thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` };
      }
    }
    return dto;
  }

  async remove(id: string) {
    const recording = await this.prisma.recording.findUnique({ where: { id } });
    if (!recording) throw new NotFoundException('Grabación no encontrada.');
    return this.prisma.recording.delete({ where: { id } });
  }
}
