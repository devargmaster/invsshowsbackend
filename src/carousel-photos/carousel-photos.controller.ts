import {
  Controller, Get, Post, Patch, Delete, Body,
  Param, UseGuards, UseInterceptors, UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { CarouselPhotosService } from './carousel-photos.service';
import { CreateCarouselPhotoDto } from './dto/create-carousel-photo.dto';
import { UpdateCarouselPhotoDto } from './dto/update-carousel-photo.dto';
import { carouselPhotoMulterOptions } from './multer.config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Carousel Photos')
@Controller()
export class CarouselPhotosController {
  constructor(private readonly carouselPhotosService: CarouselPhotosService) {}

  @Get('carousel-photos')
  @ApiOperation({ summary: 'Listar fotos de carrusel activas (público)' })
  findAllActive() {
    return this.carouselPhotosService.findAllActive();
  }

  // ── Admin ──────────────────────────────────────────────────────
  @Get('admin/carousel-photos')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Listar todas las fotos del carrusel' })
  findAll() {
    return this.carouselPhotosService.findAll();
  }

  @Post('admin/carousel-photos')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Crear foto del carrusel' })
  create(@Body() dto: CreateCarouselPhotoDto) {
    return this.carouselPhotosService.create(dto);
  }

  @Patch('admin/carousel-photos/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Actualizar foto del carrusel' })
  update(@Param('id') id: string, @Body() dto: UpdateCarouselPhotoDto) {
    return this.carouselPhotosService.update(id, dto);
  }

  @Delete('admin/carousel-photos/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Eliminar foto del carrusel' })
  remove(@Param('id') id: string) {
    return this.carouselPhotosService.remove(id);
  }

  @Post('admin/carousel-photos/upload')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', carouselPhotoMulterOptions))
  @ApiOperation({ summary: '[Admin] Subir imagen para foto del carrusel' })
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    const imageUrl = `/uploads/carousel-photos/${file.filename}`;
    return { imageUrl };
  }
}
