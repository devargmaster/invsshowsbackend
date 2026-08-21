import { Module } from '@nestjs/common';
import { StorePurchasesService } from './store-purchases.service';
import { StorePurchasesController } from './store-purchases.controller';
import { StorePurchasesCleanupService } from './store-purchases-cleanup.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [StorePurchasesController],
  providers: [StorePurchasesService, StorePurchasesCleanupService],
  exports: [StorePurchasesService],
})
export class StorePurchasesModule {}
