import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ContentAccessService } from '../common/services/content-access.service';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto';
import Mux from '@mux/mux-node';

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
   * Genera un token de playback temporal (signed JWT de Mux).
   * El cliente construye la URL: https://stream.mux.com/{playbackId}.m3u8?token={token}
   * El control de acceso ya lo hizo ContentAccessGuard antes de llegar acá.
   */
  async getPlaybackToken(recordingId: string) {
    const recording = await this.prisma.recording.findUnique({
      where: { id: recordingId },
    });
    if (!recording) throw new NotFoundException('Grabación no encontrada.');

    const token = await this.mux.jwt.signPlaybackId(recording.muxPlaybackId, {
      type: 'video',
      expiration: `${this.signedUrlTtl}s`,
    });

    return {
      playbackId: recording.muxPlaybackId,
      token,
      hlsUrl: `https://stream.mux.com/${recording.muxPlaybackId}.m3u8?token=${token}`,
      thumbnailUrl: `https://image.mux.com/${recording.muxPlaybackId}/thumbnail.jpg`,
    };
  }

  async create(dto: CreateRecordingDto) {
    return this.prisma.recording.create({ data: dto });
  }

  async update(id: string, dto: UpdateRecordingDto) {
    const recording = await this.prisma.recording.findUnique({ where: { id } });
    if (!recording) throw new NotFoundException('Grabación no encontrada.');
    return this.prisma.recording.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const recording = await this.prisma.recording.findUnique({ where: { id } });
    if (!recording) throw new NotFoundException('Grabación no encontrada.');
    return this.prisma.recording.delete({ where: { id } });
  }
}
