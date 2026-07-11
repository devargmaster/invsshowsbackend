import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreateContentPurchaseDto {
  @ApiPropertyOptional({ description: 'ID de la grabación a comprar (uno de los dos, no ambos)' })
  @IsOptional()
  @IsString()
  recordingId?: string;

  @ApiPropertyOptional({ description: 'ID del evento a comprar en vivo — pay-per-view (uno de los dos, no ambos)' })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.BANK_TRANSFER })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
