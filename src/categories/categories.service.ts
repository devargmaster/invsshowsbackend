import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPublic(eventId: string) {
    return this.prisma.ticketCategory.findMany({
      where: { eventId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllAdmin(eventId: string) {
    return this.prisma.ticketCategory.findMany({
      where: { eventId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.ticketCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Categoría no encontrada.');
    return category;
  }

  async availability(id: string) {
    const category = await this.findOne(id);
    return {
      maxCapacity: category.maxCapacity,
      reservedCount: category.reservedCount,
      available: category.maxCapacity - category.reservedCount,
    };
  }

  async create(eventId: string, dto: CreateCategoryDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado.');

    return this.prisma.ticketCategory.create({
      data: {
        eventId,
        name: dto.name,
        description: dto.description,
        priceCents: dto.priceCents,
        currency: dto.currency ?? 'ARS',
        maxCapacity: dto.maxCapacity,
        accessStartsAt: dto.accessStartsAt ? new Date(dto.accessStartsAt) : undefined,
        accessEndsAt: dto.accessEndsAt ? new Date(dto.accessEndsAt) : undefined,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.ticketCategory.update({
      where: { id },
      data: {
        ...dto,
        accessStartsAt: dto.accessStartsAt ? new Date(dto.accessStartsAt) : undefined,
        accessEndsAt: dto.accessEndsAt ? new Date(dto.accessEndsAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    const category = await this.findOne(id);
    if (category.reservedCount > 0) {
      // Ya tiene tickets asociados (pendientes/activos/usados): no se puede
      // borrar sin romper integridad referencial. Se desactiva en su lugar.
      return this.prisma.ticketCategory.update({
        where: { id },
        data: { isActive: false },
      });
    }
    return this.prisma.ticketCategory.delete({ where: { id } });
  }
}
