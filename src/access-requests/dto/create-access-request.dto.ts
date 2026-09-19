import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccessRequestDto {
  @ApiProperty({ example: 'event-uuid' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiPropertyOptional({ example: 'PRENSA-2026', description: 'Texto libre, no se valida — solo referencia para el staff' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: '+54 9 11 1234-5678', description: 'Para que el staff pueda contactar/chequear antes de aprobar (previene fraude)' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'La Nación — sección Espectáculos' })
  @IsOptional()
  @IsString()
  note?: string;
}
