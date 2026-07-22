import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../common/services/supabase-storage.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventMode, EventStatus } from '@prisma/client';
import { pickDefaultEventImage } from './default-event-images';

export interface EventFilters {
  mode?: EventMode;
  status?: EventStatus;
  upcoming?: boolean;
}

type PhotoLike = { url: string; sortOrder: number };

function withCoverImageUrl<T extends { id: string; photos?: PhotoLike[] }>(event: T) {
  const sorted = [...(event.photos ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  return { ...event, photos: sorted, coverImageUrl: sorted[0]?.url ?? pickDefaultEventImage(event.id) };
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

  async findAll(filters: EventFilters = {}) {
    const where: Record<string, unknown> = {};

    if (filters.mode) where.mode = filters.mode;
    if (filters.status) where.status = filters.status;
    if (filters.upcoming) where.date = { gte: new Date() };

    const events = await this.prisma.event.findMany({
      where,
      orderBy: { date: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        location: true,
        mode: true,
        status: true,
        maxCapacity: true,
        isLive: true,
        photos: { select: { id: true, url: true, sortOrder: true } },
        _count: { select: { tickets: true } },
      },
    });
    return events.map(withCoverImageUrl);
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        photos: true,
        _count: { select: { tickets: true } },
      },
    });
    if (!event) throw new NotFoundException('Evento no encontrado.');
    return withCoverImageUrl(event);
  }

  async create(dto: CreateEventDto) {
    const created = await this.prisma.event.create({
      data: {
        ...dto,
        date: new Date(dto.date),
      },
    });
    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdateEventDto) {
    await this.findOne(id);
    await this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    const event = await this.findOne(id);
    const deleted = await this.prisma.event.delete({ where: { id } });
    await Promise.all(event.photos.map((p) => this.storage.deleteEventPhoto(p.url)));
    return deleted;
  }

  async addPhoto(eventId: string, file: Express.Multer.File) {
    await this.assertEventExists(eventId);
    if (!file) throw new BadRequestException('Falta el archivo de imagen.');

    const url = await this.storage.uploadEventPhoto(eventId, file);
    const lastPhoto = await this.prisma.eventPhoto.findFirst({
      where: { eventId },
      orderBy: { sortOrder: 'desc' },
    });

    await this.prisma.eventPhoto.create({
      data: { eventId, url, sortOrder: (lastPhoto?.sortOrder ?? -1) + 1 },
    });

    return this.findOne(eventId);
  }

  async removePhoto(eventId: string, photoId: string) {
    await this.assertEventExists(eventId);
    const photo = await this.prisma.eventPhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.eventId !== eventId) {
      throw new NotFoundException('Foto no encontrada para este evento.');
    }

    await this.prisma.eventPhoto.delete({ where: { id: photoId } });
    await this.storage.deleteEventPhoto(photo.url);

    return this.findOne(eventId);
  }

  private async assertEventExists(id: string) {
    const exists = await this.prisma.event.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Evento no encontrado.');
  }
}
