import { Module } from '@nestjs/common';
import { ContentPurchasesService } from './content-purchases.service';
import { ContentPurchasesController } from './content-purchases.controller';
import { ContentPurchasesCleanupService } from './content-purchases-cleanup.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [ContentPurchasesController],
  providers: [ContentPurchasesService, ContentPurchasesCleanupService],
  exports: [ContentPurchasesService],
})
export class ContentPurchasesModule {}
