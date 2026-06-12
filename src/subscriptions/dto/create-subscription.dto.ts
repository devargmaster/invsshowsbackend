import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'premium' })
  @IsString()
  @IsNotEmpty()
  planName: string;

  @ApiPropertyOptional({ enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional({ example: 'ios', description: 'Plataforma de pago: ios | android | web | manual' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ description: 'ID de transacción de Apple/Google' })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento (null = sin vencimiento)', example: '2027-06-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  // userId se puede pasar en body para admin, o se toma del JWT
  @ApiPropertyOptional({ description: 'User ID (solo para admin)' })
  @IsOptional()
  @IsString()
  userId?: string;
}
