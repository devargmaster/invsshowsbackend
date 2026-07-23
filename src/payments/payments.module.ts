import { Module } from '@nestjs/common';
import { OpenpayProvider } from './providers/openpay.provider';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { PaymentsController } from './payments.controller';
import { PaymentSettingsModule } from '../payment-settings/payment-settings.module';

@Module({
  imports: [PaymentSettingsModule],
  controllers: [PaymentsController],
  providers: [OpenpayProvider, PaymentProviderFactory, MercadoPagoProvider],
  exports: [PaymentProviderFactory, MercadoPagoProvider],
})
export class PaymentsModule {}
