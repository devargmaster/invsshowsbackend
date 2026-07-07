import { Type } from 'class-transformer';
import {
  IsString, IsArray, ArrayMinSize, ValidateNested, IsEnum, IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { OrderItemDto } from './order-item.dto';
import { OrderAddonItemDto } from './order-addon-item.dto';

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  eventId: string;

  @ApiProperty({ type: [OrderItemDto], description: 'Puede mezclar varias categorías (carrito)' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ type: [OrderAddonItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderAddonItemDto)
  addons?: OrderAddonItemDto[];

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
