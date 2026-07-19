import { Module } from '@nestjs/common';
import { CarouselPhotosService } from './carousel-photos.service';
import { CarouselPhotosController } from './carousel-photos.controller';

@Module({
  controllers: [CarouselPhotosController],
  providers: [CarouselPhotosService],
  exports: [CarouselPhotosService],
})
export class CarouselPhotosModule {}
