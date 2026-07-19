import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCarouselPhotoDto } from './dto/create-carousel-photo.dto';
import { UpdateCarouselPhotoDto } from './dto/update-carousel-photo.dto';

@Injectable()
export class CarouselPhotosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.carouselPhoto.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAll() {
    return this.prisma.carouselPhoto.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const photo = await this.prisma.carouselPhoto.findUnique({
      where: { id },
    });
    if (!photo) {
      throw new NotFoundException('Foto de carrusel no encontrada.');
    }
    return photo;
  }

  async create(dto: CreateCarouselPhotoDto) {
    return this.prisma.carouselPhoto.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateCarouselPhotoDto) {
    await this.findOne(id);
    return this.prisma.carouselPhoto.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.carouselPhoto.delete({
      where: { id },
    });
  }
}
