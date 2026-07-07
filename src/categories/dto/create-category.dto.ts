import {
  IsString, IsNotEmpty, IsOptional, IsInt, Min, IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'VIP' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Acceso 2hs antes con zona exclusiva' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1500000, description: 'Precio en centavos (ej: $15.000,00 ARS = 1500000)' })
  @IsInt()
  @Min(0)
  priceCents: number;

  @ApiPropertyOptional({ example: 'ARS' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 50, description: 'Aforo máximo de esta categoría/franja horaria' })
  @IsInt()
  @Min(1)
  maxCapacity: number;

  @ApiPropertyOptional({ example: '2026-08-05T19:00:00Z', description: 'Hora de ingreso propia de esta categoría (ej: VIP entra 2hs antes)' })
  @IsOptional()
  @IsDateString()
  accessStartsAt?: string;

  @ApiPropertyOptional({ example: '2026-08-05T23:00:00Z' })
  @IsOptional()
  @IsDateString()
  accessEndsAt?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
