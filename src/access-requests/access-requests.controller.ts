import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AccessRequestsService } from './access-requests.service';
import { CreateAccessRequestDto } from './dto/create-access-request.dto';
import { ApproveAccessRequestDto } from './dto/approve-access-request.dto';
import { RejectAccessRequestDto } from './dto/reject-access-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccessRequestStatus, UserRole } from '@prisma/client';

@ApiTags('Access Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('access-requests')
export class AccessRequestsController {
  constructor(private readonly accessRequestsService: AccessRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Pedir acceso a un evento con código ("tengo código de acceso")' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateAccessRequestDto) {
    return this.accessRequestsService.create(userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Estado de mi solicitud de acceso para un evento (null si nunca pedí)' })
  @ApiQuery({ name: 'eventId', required: true })
  findMine(@CurrentUser('id') userId: string, @Query('eventId') eventId: string) {
    return this.accessRequestsService.findMine(userId, eventId);
  }

  // ── Admin ──────────────────────────────────────────────────────
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '[Admin/Staff] Listar solicitudes de acceso' })
  @ApiQuery({ name: 'status', enum: AccessRequestStatus, required: false })
  findAllAdmin(@Query('status') status?: AccessRequestStatus) {
    return this.accessRequestsService.findAllAdmin(status);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '[Admin/Staff] Aprobar una solicitud: genera una entrada real en la categoría elegida' })
  approve(@Param('id') id: string, @CurrentUser('id') adminId: string, @Body() dto: ApproveAccessRequestDto) {
    return this.accessRequestsService.approve(id, adminId, dto);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '[Admin/Staff] Rechazar una solicitud' })
  reject(@Param('id') id: string, @CurrentUser('id') adminId: string, @Body() dto: RejectAccessRequestDto) {
    return this.accessRequestsService.reject(id, adminId, dto);
  }
}
