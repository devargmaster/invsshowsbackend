import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderAddonItemDto {
  @ApiProperty({ description: 'ID del AddOn elegido' })
  @IsString()
  addonId: string;

  @ApiPropertyOptional({ description: 'ID de AddonVariant, obligatorio si el addon tiene variantes (ej: talle)' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
