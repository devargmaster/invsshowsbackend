import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { ValidateTicketDto } from './dto/ticket.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { RegisterAndAcceptTransferDto } from './dto/register-and-accept-transfer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Tickets / QR')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mis entradas (propias + sin asignar de mis compras)' })
  findMyTickets(@CurrentUser('id') userId: string) {
    return this.ticketsService.findMyTickets(userId);
  }

  @Post('validate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: '[Staff/Admin] Validar QR escaneado' })
  validate(@Body() dto: ValidateTicketDto, @CurrentUser('id') scannedById: string) {
    return this.ticketsService.validate(dto.qrPayload, scannedById);
  }

  @Get('event/:eventId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '[Admin/Staff] Listar todas las entradas de un evento' })
  findByEvent(@Param('eventId') eventId: string) {
    return this.ticketsService.findByEvent(eventId);
  }

  // ── Compartir / transferir ───────────────────────────────────────
  @Post(':id/transfers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Compartir una entrada sin asignar por email (doble confirmación en el cliente)' })
  createTransfer(
    @Param('id') ticketId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransferDto,
  ) {
    return this.ticketsService.createTransfer(ticketId, userId, dto.toEmail);
  }

  @Delete('transfers/:transferId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancelar un envío pendiente' })
  cancelTransfer(@Param('transferId') transferId: string, @CurrentUser('id') userId: string) {
    return this.ticketsService.cancelTransfer(transferId, userId);
  }

  @Get('transfers/incoming')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Entradas que me compartieron, pendientes de aceptar' })
  findIncoming(@CurrentUser('email') userEmail: string) {
    return this.ticketsService.findIncomingTransfers(userEmail);
  }

  @Get('transfers/token/:token')
  @ApiOperation({ summary: 'Detalle público de una invitación de transferencia' })
  findTransferByToken(@Param('token') token: string) {
    return this.ticketsService.findTransferByToken(token);
  }

  @Post('transfers/token/:token/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Aceptar una transferencia (ya con cuenta y sesión iniciada)' })
  acceptTransfer(@Param('token') token: string, @CurrentUser() user: { id: string; email: string }) {
    return this.ticketsService.acceptTransfer(token, user);
  }

  @Post('transfers/token/:token/register-and-accept')
  @ApiOperation({ summary: 'Registrarse con el email invitado y aceptar la transferencia en un solo paso' })
  registerAndAccept(@Param('token') token: string, @Body() dto: RegisterAndAcceptTransferDto) {
    return this.ticketsService.registerAndAcceptTransfer(token, dto.fullName, dto.password);
  }
}
