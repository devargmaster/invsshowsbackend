import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { StorePurchasesService } from './store-purchases.service';
import { CreateStorePurchaseDto } from './dto/create-store-purchase.dto';
import { PayCardDto } from './dto/pay-card.dto';
import { ValidateTransferDto } from './dto/validate-transfer.dto';
import { storePurchaseProofMulterOptions } from './multer.config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, OrderStatus, PaymentMethod } from '@prisma/client';

@ApiTags('Store Purchases')
@ApiBearerAuth()
@Controller('store-purchases')
export class StorePurchasesController {
  constructor(private readonly storePurchasesService: StorePurchasesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Comprar un producto de la Tienda (standalone, sin entrada)' })
  create(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreateStorePurchaseDto,
  ) {
    return this.storePurchasesService.create(userId, role, dto);
  }

  @Post(':id/pay/card')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Pagar una compra de la Tienda con tarjeta (Openpay)' })
  payCard(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: PayCardDto) {
    return this.storePurchasesService.payCard(id, userId, dto);
  }

  @Post(':id/pay/mercadopago')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Iniciar pago de una compra con Mercado Pago (Checkout Pro) — devuelve la URL de redirección' })
  payMercadoPago(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.storePurchasesService.payMercadoPago(id, userId);
  }

  @Post(':id/sync-mercadopago')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Consultar a Mercado Pago el estado real del pago y confirmar la compra si corresponde' })
  syncMercadoPago(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('paymentId') paymentId: string,
  ) {
    return this.storePurchasesService.syncMercadoPagoPayment(id, userId, paymentId);
  }

  @Post(':id/transfer-proof')
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', storePurchaseProofMulterOptions))
  @ApiOperation({ summary: 'Subir comprobante de transferencia bancaria' })
  uploadTransferProof(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('reference') reference?: string,
  ) {
    const fileUrl = `/uploads/store-purchase-proofs/${file.filename}`;
    return this.storePurchasesService.uploadTransferProof(id, userId, fileUrl, reference);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mis compras de la Tienda' })
  findMyPurchases(@CurrentUser('id') userId: string) {
    return this.storePurchasesService.findMyPurchases(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Detalle de una compra (dueño o staff/admin)' })
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string; role: string }) {
    return this.storePurchasesService.findOne(id, user);
  }

  // ── Admin ──────────────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Listar compras de la Tienda (ej: cola de transferencias pendientes)' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiQuery({ name: 'paymentMethod', enum: PaymentMethod, required: false })
  findAllAdmin(@Query('status') status?: OrderStatus, @Query('paymentMethod') paymentMethod?: PaymentMethod) {
    return this.storePurchasesService.findAllAdmin({ status, paymentMethod });
  }

  @Patch(':id/validate-transfer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Aprobar o rechazar una compra por transferencia' })
  validateTransfer(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ValidateTransferDto,
  ) {
    return this.storePurchasesService.validateTransfer(id, adminId, dto);
  }
}
