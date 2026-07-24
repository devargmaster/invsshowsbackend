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
      where: { eventId, isActive: true },
      include: { variants: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllAdmin(eventId: string) {
    return this.prisma.addOn.findMany({
      where: { eventId },
      include: { variants: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const addon = await this.prisma.addOn.findUnique({
      where: { id },
      include: { variants: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!addon) throw new NotFoundException('Adicional no encontrado.');
    return addon;
  }

  async create(eventId: string, dto: CreateAddonDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado.');

    const hasVariants = dto.hasVariants ?? false;

    return this.prisma.addOn.create({
      data: {
        eventId,
        name: dto.name,
        description: dto.description,
        priceCents: dto.priceCents,
        currency: dto.currency ?? 'ARS',
        hasVariants,
        maxStock: dto.maxStock,
        sortOrder: dto.sortOrder ?? 0,
        variants:
          hasVariants && dto.variants?.length
            ? { create: dto.variants.map((label, i) => ({ label, sortOrder: i })) }
            : undefined,
      },
      include: { variants: true },
    });
  }

  async update(id: string, dto: UpdateAddonDto) {
    await this.findOne(id);
    return this.prisma.addOn.update({
      where: { id },
      data: { ...dto },
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
