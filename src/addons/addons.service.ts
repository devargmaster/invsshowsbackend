import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../common/services/supabase-storage.service';
import { CreateAddonDto } from './dto/create-addon.dto';
import { UpdateAddonDto } from './dto/update-addon.dto';

@Injectable()
export class AddonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

  async findAllPublic(eventId: string) {
    return this.prisma.addOn.findMany({
      where: { isActive: true, eventLinks: { some: { eventId } } },
      include: { variants: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllAdmin(eventId: string) {
    return this.prisma.addOn.findMany({
      where: { eventLinks: { some: { eventId } } },
      include: { variants: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** [Admin] Todos los productos, sin filtrar por evento — pantalla global de Productos. */
  async findAllProducts() {
    return this.prisma.addOn.findMany({
      include: {
        variants: { orderBy: { sortOrder: 'asc' } },
        eventLinks: { include: { event: { select: { id: true, title: true } } } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Catálogo público de la Tienda: productos standalone, sin importar a qué eventos estén vinculados. */
  async findStoreProducts() {
    return this.prisma.addOn.findMany({
      where: { isActive: true, showInStore: true },
      include: { variants: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const addon = await this.prisma.addOn.findUnique({
      where: { id },
      include: {
        variants: { orderBy: { sortOrder: 'asc' } },
        eventLinks: { include: { event: { select: { id: true, title: true } } } },
      },
    });
    if (!addon) throw new NotFoundException('Adicional no encontrado.');
    return addon;
  }

  /** Crea un producto. `dto.eventIds` puede venir vacío (producto solo de Tienda). */
  async create(dto: CreateAddonDto) {
    const eventIds = [...new Set(dto.eventIds ?? [])];
    if (eventIds.length) {
      const count = await this.prisma.event.count({ where: { id: { in: eventIds } } });
      if (count !== eventIds.length) throw new NotFoundException('Alguno de los eventos indicados no existe.');
    }

    const hasVariants = dto.hasVariants ?? false;

    return this.prisma.addOn.create({
      data: {
        name: dto.name,
        description: dto.description,
        priceCents: dto.priceCents,
        currency: dto.currency ?? 'ARS',
        hasVariants,
        maxStock: dto.maxStock,
        sortOrder: dto.sortOrder ?? 0,
        showInStore: dto.showInStore ?? false,
        eventLinks: eventIds.length ? { create: eventIds.map((eventId) => ({ eventId })) } : undefined,
        variants:
          hasVariants && dto.variants?.length
            ? { create: dto.variants.map((label, i) => ({ label, sortOrder: i })) }
            : undefined,
      },
      include: { variants: true, eventLinks: true },
    });
  }

  async update(id: string, dto: UpdateAddonDto) {
    await this.findOne(id);
    const { eventIds, ...rest } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (eventIds !== undefined) {
        const uniqueIds = [...new Set(eventIds)];
        if (uniqueIds.length) {
          const count = await tx.event.count({ where: { id: { in: uniqueIds } } });
          if (count !== uniqueIds.length) throw new NotFoundException('Alguno de los eventos indicados no existe.');
        }
        // Reemplaza el set completo de vínculos por el nuevo (simple de razonar
        // desde el form de Productos, que siempre manda la lista completa).
        await tx.addonEventLink.deleteMany({ where: { addonId: id } });
        if (uniqueIds.length) {
          await tx.addonEventLink.createMany({ data: uniqueIds.map((eventId) => ({ addonId: id, eventId })) });
        }
      }
      return tx.addOn.update({
        where: { id },
        data: { ...rest },
        include: { variants: true, eventLinks: true },
      });
    });
  }

  async remove(id: string) {
    const addon = await this.findOne(id);
    if (addon.reservedStock > 0) {
      // Ya hay compras de este adicional: no se puede borrar sin romper
      // integridad referencial. Se desactiva en su lugar.
      return this.prisma.addOn.update({ where: { id }, data: { isActive: false } });
    }
    return this.prisma.addOn.delete({ where: { id } });
  }

  async setImage(id: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Falta el archivo de imagen.');
    const addon = await this.findOne(id);

    const url = await this.storage.uploadAddonImage(id, file);
    if (addon.imageUrl) await this.storage.deleteAddonImage(addon.imageUrl);

    return this.prisma.addOn.update({ where: { id }, data: { imageUrl: url } });
  }

  async removeImage(id: string) {
    const addon = await this.findOne(id);
    if (addon.imageUrl) await this.storage.deleteAddonImage(addon.imageUrl);
    return this.prisma.addOn.update({ where: { id }, data: { imageUrl: null } });
  }

  async addVariant(addonId: string, label: string) {
    await this.findOne(addonId);
    return this.prisma.addonVariant.create({ data: { addonId, label } });
  }

  async removeVariant(variantId: string) {
    try {
      return await this.prisma.addonVariant.delete({ where: { id: variantId } });
    } catch {
      throw new ConflictException('No se puede eliminar: ya hay compras con esta variante.');
    }
  }
}
