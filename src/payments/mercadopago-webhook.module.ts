import { Module } from '@nestjs/common';
import { MercadoPagoWebhookController } from './mercadopago-webhook.controller';
import { PaymentsModule } from './payments.module';
import { OrdersModule } from '../orders/orders.module';
import { ContentPurchasesModule } from '../content-purchases/content-purchases.module';

@Module({
  imports: [PaymentsModule, OrdersModule, ContentPurchasesModule],
  controllers: [MercadoPagoWebhookController],
})
export class MercadoPagoWebhookModule {}
