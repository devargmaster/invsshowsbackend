import { Module } from '@nestjs/common';
import { OpenpayProvider } from './providers/openpay.provider';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { PaymentsController } from './payments.controller';

@Module({
  controllers: [PaymentsController],
  providers: [OpenpayProvider, PaymentProviderFactory],
  exports: [PaymentProviderFactory],
})
export class PaymentsModule {}
