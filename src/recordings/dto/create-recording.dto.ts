import {
  IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, IsUrl, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRecordingDto {
  @ApiPropertyOptional({ description: 'ID del evento relacionado (opcional)' })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiProperty({ example: 'INVS Live Session #1 — Grabación completa' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  // Fuente del video: URL externa (ej. YouTube) O el par de IDs de Mux.
  // El service valida que al menos una de las dos esté presente.
  @ApiPropertyOptional({ description: 'URL externa del video (ej. YouTube)' })
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Asset ID de Mux (del video subido o grabado en live)' })
  @IsOptional()
  @IsString()
  muxAssetId?: string;

  @ApiPropertyOptional({ description: 'Playback ID de Mux' })
  @IsOptional()
  @IsString()
  muxPlaybackId?: string;

  @ApiPropertyOptional({ description: 'Duración en segundos' })
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiPropertyOptional({ description: 'URL del thumbnail' })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  // ─── Acceso combinable — ver ContentAccessService ─────────────────────
  @ApiPropertyOptional({ default: false, description: 'Si es gratis para cualquier usuario logueado' })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ default: true, description: 'Si una suscripción activa da acceso' })
  @IsOptional()
  @IsBoolean()
  includedInSubscription?: boolean;

  @ApiPropertyOptional({ description: 'Precio en centavos para comprar suelto; si no se manda, no se vende suelto' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @ApiPropertyOptional({ default: 'ARS' })
  @IsOptional()
  @IsString()
  currency?: string;
}
