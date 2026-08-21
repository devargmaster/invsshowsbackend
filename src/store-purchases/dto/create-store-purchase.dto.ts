import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreateStorePurchaseDto {
  @ApiProperty({ description: 'ID del producto (AddOn) a comprar' })
  @IsString()
  addonId: string;

  @ApiPropertyOptional({ description: 'ID de AddonVariant, obligatorio si el producto tiene variantes (ej: talle)' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.BANK_TRANSFER })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
