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

  @ApiPropertyOptional({ example: 'La Nación — sección Espectáculos' })
  @IsOptional()
  @IsString()
  note?: string;
}
