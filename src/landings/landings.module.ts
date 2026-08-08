import { Module } from '@nestjs/common';
import { LandingsService } from './landings.service';
import { LandingsController } from './landings.controller';

@Module({
  controllers: [LandingsController],
  providers: [LandingsService],
  exports: [LandingsService],
})
export class LandingsModule {}
