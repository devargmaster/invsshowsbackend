import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RecordingsService } from './recordings.service';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ContentAccessGuard } from '../common/guards/content-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ContentTarget } from '../common/decorators/content-target.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Recordings')
@Controller('recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar catálogo de grabaciones (hub de streaming) — el acceso real se resuelve por ítem' })
  findAll(@CurrentUser() user: { id: string }) {
    return this.recordingsService.findAllForUser(user.id);
  }

  @Get('by-event/:eventId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar grabaciones de un evento específico' })
  findByEvent(@Param('eventId') eventId: string, @CurrentUser() user: { id: string }) {
    return this.recordingsService.findByEventId(eventId, user.id);
  }

  @Get(':id/token')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ContentAccessGuard)
  @ContentTarget('recording')
  @ApiOperation({ summary: 'Obtener token de reproducción de una grabación (gratis, suscripción o compra)' })
  getToken(@Param('id') id: string) {
    return this.recordingsService.getPlaybackToken(id);
  }

  // ── Admin ──────────────────────────────────────────────────────
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Agregar grabación a la biblioteca' })
  create(@Body() dto: CreateRecordingDto) {
    return this.recordingsService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Editar grabación (incluye modos de acceso y precio)' })
  update(@Param('id') id: string, @Body() dto: UpdateRecordingDto) {
    return this.recordingsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Eliminar grabación' })
  remove(@Param('id') id: string) {
    return this.recordingsService.remove(id);
  }
}
