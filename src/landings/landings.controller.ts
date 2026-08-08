import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LandingsService } from './landings.service';
import { CreateLandingDto } from './dto/create-landing.dto';
import { UpdateLandingDto } from './dto/update-landing.dto';

@ApiTags('Landings')
@Controller('landings')
export class LandingsController {
  constructor(private readonly landingsService: LandingsService) {}

  // ── Admin ── declaradas antes que ':slug' para que 'admin' no matchee
  // como si fuera un slug (Nest resuelve por orden de declaración).
  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Listar todas las landings (cualquier estado)' })
  findAllAdmin() {
    return this.landingsService.findAllAdmin();
  }

  @Get('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Detalle de una landing por ID, para editar' })
  findOneAdmin(@Param('id') id: string) {
    return this.landingsService.findOneAdmin(id);
  }

  @Post('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Crear landing' })
  create(@Body() dto: CreateLandingDto) {
    return this.landingsService.create(dto);
  }

  @Patch('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Actualizar landing' })
  update(@Param('id') id: string, @Body() dto: UpdateLandingDto) {
    return this.landingsService.update(id, dto);
  }

  @Delete('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Eliminar landing' })
  remove(@Param('id') id: string) {
    return this.landingsService.remove(id);
  }

  // ── Público ──────────────────────────────────────────────────────
  @Get(':slug')
  @ApiOperation({ summary: 'Obtener una landing publicada por slug' })
  findPublicBySlug(@Param('slug') slug: string) {
    return this.landingsService.findPublicBySlug(slug);
  }
}
