import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentSettingsService } from './payment-settings.service';
import { UpsertPaymentSettingsDto } from './dto/upsert-payment-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Payment Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/payment-settings')
export class PaymentSettingsController {
  constructor(private readonly paymentSettingsService: PaymentSettingsService) {}

  @Get(':provider')
  @ApiOperation({ summary: '[Admin] Ver estado de la credencial de un proveedor de pago (nunca el secreto)' })
  get(@Param('provider') provider: string) {
    return this.paymentSettingsService.getPublic(provider);
  }

  @Patch(':provider')
  @ApiOperation({ summary: '[Admin] Configurar/reemplazar la credencial de un proveedor de pago' })
  upsert(
    @Param('provider') provider: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: UpsertPaymentSettingsDto,
  ) {
    return this.paymentSettingsService.upsert(provider, adminId, dto);
  }
}
