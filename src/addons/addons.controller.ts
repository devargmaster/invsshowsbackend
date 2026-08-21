import {
  Controller, Get, Post, Patch, Delete, Body,
  Param, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { AddonsService } from './addons.service';
import { CreateAddonDto } from './dto/create-addon.dto';
import { UpdateAddonDto } from './dto/update-addon.dto';
import { AddVariantDto } from './dto/add-variant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { imageUploadMulterOptions } from '../common/config/image-upload-multer.config';
import { UserRole } from '@prisma/client';

@ApiTags('Add-ons')
@Controller()
export class AddonsController {
  constructor(private readonly addonsService: AddonsService) {}

  @Get('events/:eventId/addons')
  @ApiOperation({ summary: 'Listar adicionales activos de un evento (público)' })
  findAllPublic(@Param('eventId') eventId: string) {
    return this.addonsService.findAllPublic(eventId);
  }

  @Get('store/products')
  @ApiOperation({ summary: 'Catálogo público de la Tienda (productos standalone)' })
  findStoreProducts() {
    return this.addonsService.findStoreProducts();
  }

  // ── Admin ──────────────────────────────────────────────────────
  @Get('addons/admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Listar TODOS los productos (catálogo global, sin filtrar por evento)' })
  findAllProducts() {
    return this.addonsService.findAllProducts();
  }

  @Get('events/:eventId/addons/admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Listar los adicionales de un evento, incluye inactivos' })
  findAllAdmin(@Param('eventId') eventId: string) {
    return this.addonsService.findAllAdmin(eventId);
  }

  @Post('addons')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Crear producto (sin evento asociado, o vinculado a varios vía eventIds)' })
  create(@Body() dto: CreateAddonDto) {
    return this.addonsService.create(dto);
  }

  @Post('events/:eventId/addons')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Crear adicional ya vinculado a este evento (con variantes opcionales)' })
  createForEvent(@Param('eventId') eventId: string, @Body() dto: CreateAddonDto) {
    return this.addonsService.create({ ...dto, eventIds: [...new Set([...(dto.eventIds ?? []), eventId])] });
  }

  @Patch('addons/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Actualizar adicional' })
  update(@Param('id') id: string, @Body() dto: UpdateAddonDto) {
    return this.addonsService.update(id, dto);
  }

  @Delete('addons/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Eliminar adicional (se desactiva si ya tiene ventas)' })
  remove(@Param('id') id: string) {
    return this.addonsService.remove(id);
  }

  @Post('addons/:id/image')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', imageUploadMulterOptions))
  @ApiOperation({ summary: '[Admin] Subir (o reemplazar) la imagen de un adicional' })
  setImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.addonsService.setImage(id, file);
  }

  @Delete('addons/:id/image')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Quitar la imagen de un adicional' })
  removeImage(@Param('id') id: string) {
    return this.addonsService.removeImage(id);
  }

  @Post('addons/:id/variants')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Agregar una variante (ej: talle) a un adicional' })
  addVariant(@Param('id') id: string, @Body() dto: AddVariantDto) {
    return this.addonsService.addVariant(id, dto.label);
  }

  @Delete('addons/variants/:variantId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Eliminar una variante' })
  removeVariant(@Param('variantId') variantId: string) {
    return this.addonsService.removeVariant(variantId);
  }
}
