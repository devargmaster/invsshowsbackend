import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecordingDto } from './dto/create-recording.dto';
import Mux from '@mux/mux-node';

@Injectable()
export class RecordingsService {
  private readonly mux: Mux;
  private readonly signedUrlTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.mux = new Mux({
      tokenId: this.config.get<string>('mux.tokenId') ?? '',
      tokenSecret: this.config.get<string>('mux.tokenSecret') ?? '',
    });
    this.signedUrlTtl = this.config.get<number>('mux.signedUrlTtl') ?? 3600;
  }

  async findAll(isAdmin = false) {
    const where = isAdmin ? {} : { status: 'PUBLISHED' };
    return this.prisma.recording.findMany({
      where: isAdmin ? undefined : { requiresSubscription: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        thumbnailUrl: true,
        isPublic: true,
        requiresSubscription: true,
        createdAt: true,
        event: { select: { id: true, title: true, date: true } },
      },
    });
  }

  async findAllForSubscriber() {
    return this.prisma.recording.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        thumbnailUrl: true,
        createdAt: true,
        event: { select: { id: true, title: true, date: true } },
      },
    });
  }

  /** Obtiene grabaciones vinculadas a un evento específico */
  async findByEventId(eventId: string) {
    return this.prisma.recording.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        thumbnailUrl: true,
        createdAt: true,
      },
    });
  }

  /**
   * Genera un token de playback temporal (signed JWT de Mux).
   * El cliente construye la URL: https://stream.mux.com/{playbackId}.m3u8?token={token}
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
      // URL del thumbnail de Mux
      thumbnailUrl: `https://image.mux.com/${recording.muxPlaybackId}/thumbnail.jpg`,
    };
  }

  async create(dto: CreateRecordingDto) {
    return this.prisma.recording.create({ data: dto });
  }

  async remove(id: string) {
    const recording = await this.prisma.recording.findUnique({ where: { id } });
    if (!recording) throw new NotFoundException('Grabación no encontrada.');
    return this.prisma.recording.delete({ where: { id } });
  }
}
