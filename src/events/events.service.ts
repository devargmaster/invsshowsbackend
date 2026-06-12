import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventMode, EventStatus } from '@prisma/client';

export interface EventFilters {
  mode?: EventMode;
  status?: EventStatus;
  upcoming?: boolean;
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: EventFilters = {}) {
    const where: Record<string, unknown> = {};

    if (filters.mode) where.mode = filters.mode;
    if (filters.status) where.status = filters.status;
    if (filters.upcoming) where.date = { gte: new Date() };

    return this.prisma.event.findMany({
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
        coverImageUrl: true,
        maxCapacity: true,
        isLive: true,
        _count: { select: { tickets: true } },
      },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        _count: { select: { tickets: true } },
      },
    });
    if (!event) throw new NotFoundException('Evento no encontrado.');
    return event;
  }

  async create(dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        ...dto,
        date: new Date(dto.date),
      },
    });
  }

  async update(id: string, dto: UpdateEventDto) {
    await this.findOne(id);
    return this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.event.delete({ where: { id } });
  }
}
