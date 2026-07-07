import {
  IsString, IsNotEmpty, IsOptional, IsInt, Min, IsBoolean, IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddonDto {
  @ApiProperty({ example: 'Remera conmemorativa' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Remera oficial del evento, edición limitada' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 800000, description: 'Precio en centavos' })
  @IsInt()
  @Min(0)
  priceCents: number;

  @ApiPropertyOptional({ example: 'ARS' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: true, description: 'true si tiene variantes (ej: talles de remera)' })
  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @ApiPropertyOptional({ example: ['S', 'M', 'L', 'XL'], description: 'Etiquetas de variante iniciales, solo si hasVariants=true' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variants?: string[];

  @ApiPropertyOptional({ example: 100, description: 'Stock máximo, sin definir = ilimitado' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStock?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
