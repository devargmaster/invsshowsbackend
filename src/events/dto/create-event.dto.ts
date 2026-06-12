import {
  IsString, IsNotEmpty, IsOptional, IsEnum,
  IsDateString, IsInt, IsUrl, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventMode } from '@prisma/client';

export class CreateEventDto {
  @ApiProperty({ example: 'INVS Live Session #1' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Evento musical en vivo con acceso presencial y streaming.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: '2026-07-20T21:00:00Z' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'INVS Studio, Buenos Aires' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ enum: EventMode, example: EventMode.HIBRIDO })
  @IsEnum(EventMode)
  mode: EventMode;

  @ApiPropertyOptional({ description: 'URL de imagen de portada' })
  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: 200, description: 'Capacidad máxima presencial' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacity?: number;
}
