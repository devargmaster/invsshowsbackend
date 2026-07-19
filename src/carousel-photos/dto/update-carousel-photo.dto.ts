import { PartialType } from '@nestjs/swagger';
import { CreateCarouselPhotoDto } from './create-carousel-photo.dto';

export class UpdateCarouselPhotoDto extends PartialType(CreateCarouselPhotoDto) {}
