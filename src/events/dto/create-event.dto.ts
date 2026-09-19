import {
  IsString, IsNotEmpty, IsOptional, IsEnum,
  IsDateString, IsInt, Min, IsBoolean,
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

  @ApiPropertyOptional({ example: '2026-07-20T21:00:00Z', description: 'Se puede cargar aunque el evento todavía no esté liberado comercialmente (ver commerciallyReleased)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ default: false, description: 'false = se muestra como "Próximamente" y no se pueden comprar entradas, aunque ya tenga fecha cargada' })
  @IsOptional()
  @IsBoolean()
  commerciallyReleased?: boolean;

  @ApiPropertyOptional({ example: 'INVS Studio, Buenos Aires' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ enum: EventMode, example: EventMode.HIBRIDO })
  @IsEnum(EventMode)
  mode: EventMode;

  @ApiPropertyOptional({ example: 200, description: 'Capacidad máxima presencial' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacity?: number;

  // ─── Acceso al streaming en vivo — combinable, ver ContentAccessService ───
  @ApiPropertyOptional({ default: false, description: 'Si el vivo es gratis para cualquier usuario logueado' })
  @IsOptional()
  @IsBoolean()
  liveIsFree?: boolean;

  @ApiPropertyOptional({ default: true, description: 'Si una suscripción activa da acceso al vivo' })
  @IsOptional()
  @IsBoolean()
  liveIncludedInSubscription?: boolean;

  @ApiPropertyOptional({ description: 'Precio en centavos para comprar el vivo suelto (pay-per-view); si no se manda, no se vende suelto' })
  @IsOptional()
  @IsInt()
  @Min(0)
  livePriceCents?: number;

  @ApiPropertyOptional({ default: 'ARS' })
  @IsOptional()
  @IsString()
  liveCurrency?: string;
}
