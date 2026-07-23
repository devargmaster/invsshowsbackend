import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PayCardDto } from './dto/pay-card.dto';
import { ValidateTransferDto } from './dto/validate-transfer.dto';
import { transferProofMulterOptions } from './multer.config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, OrderStatus, PaymentMethod } from '@prisma/client';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Get('bank-transfer-info')
  @ApiOperation({ summary: 'Datos bancarios a mostrar en el checkout por transferencia (público)' })
  getBankTransferInfo() {
    return this.ordersService.getBankTransferInfo();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Crear una orden (carrito de categorías + adicionales), reserva capacidad' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId, dto);
  }

  @Post(':id/pay/card')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Pagar una orden con tarjeta (Openpay)' })
  payCard(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: PayCardDto) {
    return this.ordersService.payCard(id, userId, dto);
  }

  @Post(':id/pay/mercadopago')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Iniciar pago de una orden con Mercado Pago (Checkout Pro) — devuelve la URL de redirección' })
  payMercadoPago(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ordersService.payMercadoPago(id, userId);
  }

  @Post(':id/transfer-proof')
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', transferProofMulterOptions))
  @ApiOperation({ summary: 'Subir comprobante de transferencia bancaria' })
  uploadTransferProof(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('reference') reference?: string,
  ) {
    const fileUrl = `/uploads/transfer-proofs/${file.filename}`;
    return this.ordersService.uploadTransferProof(id, userId, fileUrl, reference);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mis órdenes' })
  findMyOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.findMyOrders(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Detalle de una orden (dueño o staff/admin)' })
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string; role: string }) {
    return this.ordersService.findOne(id, user);
  }

  // ── Admin ──────────────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Listar órdenes (ej: cola de transferencias pendientes)' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiQuery({ name: 'paymentMethod', enum: PaymentMethod, required: false })
  findAllAdmin(@Query('status') status?: OrderStatus, @Query('paymentMethod') paymentMethod?: PaymentMethod) {
    return this.ordersService.findAllAdmin({ status, paymentMethod });
  }

  @Patch(':id/validate-transfer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Aprobar o rechazar una orden por transferencia' })
  validateTransfer(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ValidateTransferDto,
  ) {
    return this.ordersService.validateTransfer(id, adminId, dto);
  }
}
