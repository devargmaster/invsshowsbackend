import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersCleanupService } from './orders-cleanup.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersCleanupService],
  exports: [OrdersService],
})
export class OrdersModule {}
