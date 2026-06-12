import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto, ValidateTicketDto } from './dto/ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Tickets / QR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Generar ticket QR para un evento (requiere suscripción activa)' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(userId, dto.eventId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Mis tickets' })
  findMyTickets(@CurrentUser('id') userId: string) {
    return this.ticketsService.findMyTickets(userId);
  }

  @Post('validate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: '[Staff/Admin] Validar QR escaneado' })
  validate(
    @Body() dto: ValidateTicketDto,
    @CurrentUser('id') scannedById: string,
  ) {
    return this.ticketsService.validate(dto.qrPayload, scannedById);
  }

  @Get('event/:eventId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '[Admin/Staff] Listar todos los tickets de un evento' })
  findByEvent(@Param('eventId') eventId: string) {
    return this.ticketsService.findByEvent(eventId);
  }
}
