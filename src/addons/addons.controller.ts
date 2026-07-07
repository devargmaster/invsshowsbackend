import {
  Controller, Get, Post, Patch, Delete, Body,
  Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AddonsService } from './addons.service';
import { CreateAddonDto } from './dto/create-addon.dto';
import { UpdateAddonDto } from './dto/update-addon.dto';
import { AddVariantDto } from './dto/add-variant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
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

  // ── Admin ──────────────────────────────────────────────────────
  @Get('events/:eventId/addons/admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Listar todos los adicionales, incluye inactivos' })
  findAllAdmin(@Param('eventId') eventId: string) {
    return this.addonsService.findAllAdmin(eventId);
  }

  @Post('events/:eventId/addons')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Crear adicional (con variantes opcionales)' })
  create(@Param('eventId') eventId: string, @Body() dto: CreateAddonDto) {
    return this.addonsService.create(eventId, dto);
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
