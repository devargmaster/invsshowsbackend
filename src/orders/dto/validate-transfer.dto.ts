import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateTransferDto {
  @ApiProperty({ description: 'true = aprobar el pago, false = rechazarlo' })
  @IsBoolean()
  approve: boolean;

  @ApiPropertyOptional({ description: 'Motivo del rechazo (se le muestra al comprador)' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
