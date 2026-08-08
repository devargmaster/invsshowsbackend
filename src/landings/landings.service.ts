import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { LandingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLandingDto } from './dto/create-landing.dto';
import { UpdateLandingDto } from './dto/update-landing.dto';

@Injectable()
export class LandingsService {
  constructor(private readonly prisma: PrismaService) {}

  // [Admin] todas, sin importar estado — la pantalla de gestión necesita ver borradores.
  findAllAdmin() {
    return this.prisma.landing.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  async findOneAdmin(id: string) {
    const landing = await this.prisma.landing.findUnique({ where: { id } });
    if (!landing) throw new NotFoundException('Landing no encontrada.');
    return landing;
  }

  // Público: solo landings publicadas, por slug — un borrador no es
  // encontrable ni con el link exacto.
  async findPublicBySlug(slug: string) {
    const landing = await this.prisma.landing.findUnique({ where: { slug } });
    if (!landing || landing.status !== LandingStatus.PUBLISHED) {
      throw new NotFoundException('Landing no encontrada.');
    }
    return landing;
  }

  async create(dto: CreateLandingDto) {
    try {
      return await this.prisma.landing.create({
        data: { ...dto, blocks: dto.blocks as unknown as Prisma.InputJsonValue },
      });
    } catch (e) {
      throw this.mapUniqueSlugError(e);
    }
  }

  async update(id: string, dto: UpdateLandingDto) {
    await this.findOneAdmin(id);
    try {
      return await this.prisma.landing.update({
        where: { id },
        data: { ...dto, blocks: dto.blocks as unknown as Prisma.InputJsonValue | undefined },
      });
    } catch (e) {
      throw this.mapUniqueSlugError(e);
    }
  }

  async remove(id: string) {
    await this.findOneAdmin(id);
    await this.prisma.landing.delete({ where: { id } });
    return { deleted: true };
  }

  private mapUniqueSlugError(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return new ConflictException('Ya existe una landing con ese slug.');
    }
    return e;
  }
}
