import { Module } from '@nestjs/common';
import { RecordingsService } from './recordings.service';
import { RecordingsController } from './recordings.controller';

@Module({
  controllers: [RecordingsController],
  providers: [RecordingsService],
})
export class RecordingsModule {}
