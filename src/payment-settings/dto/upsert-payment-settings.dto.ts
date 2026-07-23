import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertPaymentSettingsDto {
  @ApiProperty({ enum: ['sandbox', 'production'] })
  @IsIn(['sandbox', 'production'])
  environment: 'sandbox' | 'production';

  @ApiPropertyOptional({
    description: 'Access token secreto. Si se omite o viene vacío, se conserva el valor ya guardado.',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  accessToken?: string;

  @ApiPropertyOptional({ description: 'Public key (no sensible, se puede exponer al frontend)' })
  @IsOptional()
  @IsString()
  publicKey?: string;

  @ApiPropertyOptional({
    description:
      'Clave secreta de verificación de webhooks (panel de Notificaciones de Mercado Pago). Si se omite o viene vacía, se conserva la ya guardada.',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  webhookSecret?: string;
}
