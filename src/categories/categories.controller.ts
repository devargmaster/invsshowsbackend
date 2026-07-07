import {
  Controller, Get, Post, Patch, Delete, Body,
  Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Ticket Categories')
@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('events/:eventId/categories')
  @ApiOperation({ summary: 'Listar categorías activas de un evento (público)' })
  findAllPublic(@Param('eventId') eventId: string) {
    return this.categoriesService.findAllPublic(eventId);
  }

  @Get('categories/:id/availability')
  @ApiOperation({ summary: 'Disponibilidad (cupo restante) de una categoría' })
  availability(@Param('id') id: string) {
    return this.categoriesService.availability(id);
  }

  // ── Admin ──────────────────────────────────────────────────────
  @Get('events/:eventId/categories/admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Listar todas las categorías, incluye inactivas' })
  findAllAdmin(@Param('eventId') eventId: string) {
    return this.categoriesService.findAllAdmin(eventId);
  }

  @Post('events/:eventId/categories')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Crear categoría de entrada' })
  create(@Param('eventId') eventId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(eventId, dto);
  }

  @Patch('categories/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Actualizar categoría' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete('categories/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Eliminar categoría (se desactiva en vez de borrar si ya tiene reservas)' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
