import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RecordingsService } from './recordings.service';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Recordings')
@Controller('recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiOperation({ summary: 'Listar grabaciones disponibles (requiere suscripción)' })
  findAll(@CurrentUser() user: { role: string }) {
    return this.recordingsService.findAllForSubscriber();
  }

  @Get(':id/token')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiOperation({ summary: 'Obtener token de reproducción de una grabación (requiere suscripción)' })
  getToken(@Param('id') id: string) {
    return this.recordingsService.getPlaybackToken(id);
  }

  @Get('by-event/:eventId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiOperation({ summary: 'Listar grabaciones de un evento específico (requiere suscripción)' })
  findByEvent(@Param('eventId') eventId: string) {
    return this.recordingsService.findByEventId(eventId);
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

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Eliminar grabación' })
  remove(@Param('id') id: string) {
    return this.recordingsService.remove(id);
  }
}
