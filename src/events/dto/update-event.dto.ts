import { PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';
import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isLive?: boolean;
}
