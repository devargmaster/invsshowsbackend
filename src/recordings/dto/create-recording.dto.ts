import {
  IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, IsUrl,
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

  @ApiProperty({ description: 'Asset ID de Mux (del video subido o grabado en live)' })
  @IsString()
  @IsNotEmpty()
  muxAssetId: string;

  @ApiProperty({ description: 'Playback ID de Mux' })
  @IsString()
  @IsNotEmpty()
  muxPlaybackId: string;

  @ApiPropertyOptional({ description: 'Duración en segundos' })
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiPropertyOptional({ description: 'URL del thumbnail' })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ default: false, description: 'Si es público (sin suscripción)' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requiresSubscription?: boolean;
}
