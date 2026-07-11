import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { ContentPurchasesService } from './content-purchases.service';
import { CreateContentPurchaseDto } from './dto/create-content-purchase.dto';
import { PayCardDto } from './dto/pay-card.dto';
import { ValidateTransferDto } from './dto/validate-transfer.dto';
import { contentPurchaseProofMulterOptions } from './multer.config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, OrderStatus, PaymentMethod } from '@prisma/client';

@ApiTags('Content Purchases')
@ApiBearerAuth()
@Controller('content-purchases')
export class ContentPurchasesController {
  constructor(private readonly contentPurchasesService: ContentPurchasesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Comprar contenido suelto (una grabación o el vivo de un evento)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateContentPurchaseDto) {
    return this.contentPurchasesService.create(userId, dto);
  }

  @Post(':id/pay/card')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Pagar una compra de contenido con tarjeta (Openpay)' })
  payCard(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: PayCardDto) {
    return this.contentPurchasesService.payCard(id, userId, dto);
  }

  @Post(':id/transfer-proof')
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', contentPurchaseProofMulterOptions))
  @ApiOperation({ summary: 'Subir comprobante de transferencia bancaria' })
  uploadTransferProof(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('reference') reference?: string,
  ) {
    const fileUrl = `/uploads/content-purchase-proofs/${file.filename}`;
    return this.contentPurchasesService.uploadTransferProof(id, userId, fileUrl, reference);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mis compras de contenido' })
  findMyPurchases(@CurrentUser('id') userId: string) {
    return this.contentPurchasesService.findMyPurchases(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Detalle de una compra (dueño o staff/admin)' })
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string; role: string }) {
    return this.contentPurchasesService.findOne(id, user);
  }

  // ── Admin ──────────────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Listar compras de contenido (ej: cola de transferencias pendientes)' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiQuery({ name: 'paymentMethod', enum: PaymentMethod, required: false })
  findAllAdmin(@Query('status') status?: OrderStatus, @Query('paymentMethod') paymentMethod?: PaymentMethod) {
    return this.contentPurchasesService.findAllAdmin({ status, paymentMethod });
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
    return this.contentPurchasesService.validateTransfer(id, adminId, dto);
  }
}
