import {
  Controller, Get, Post, Patch, Delete, Body,
  Param, Query, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, EventMode, EventStatus } from '@prisma/client';
import { eventPhotoMulterOptions } from './event-photo-multer.config';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar eventos (público con filtros)' })
  @ApiQuery({ name: 'mode', enum: EventMode, required: false })
  @ApiQuery({ name: 'status', enum: EventStatus, required: false })
  @ApiQuery({ name: 'upcoming', type: Boolean, required: false })
  findAll(
    @Query('mode') mode?: EventMode,
    @Query('status') status?: EventStatus,
    @Query('upcoming') upcoming?: string,
  ) {
    return this.eventsService.findAll({
      mode,
      status,
      upcoming: upcoming === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un evento' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  // ── Admin ──────────────────────────────────────────────────────
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Crear evento' })
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Actualizar evento' })
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Eliminar evento' })
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  @Post(':id/photos')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', eventPhotoMulterOptions))
  @ApiOperation({ summary: '[Admin] Agregar foto a la galería del evento' })
  addPhoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.eventsService.addPhoto(id, file);
  }

  @Delete(':id/photos/:photoId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Quitar una foto de la galería del evento' })
  removePhoto(@Param('id') id: string, @Param('photoId') photoId: string) {
    return this.eventsService.removePhoto(id, photoId);
  }
}
