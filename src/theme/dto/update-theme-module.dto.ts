import { IsOptional, Matches, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const HEX_COLOR = /^#([0-9A-Fa-f]{3}){1,2}$/;

// A diferencia de UpdateThemeDto (merge parcial sobre el global), este DTO
// reemplaza el override completo del módulo: cada campo es hex (lo
// personaliza) o null (lo hace heredar el color global). `undefined` no es
// un valor válido de negocio acá — el form del backoffice siempre manda las
// 10 claves con uno de los otros dos valores.
export class UpdateThemeModuleDto {
  @ApiPropertyOptional({ example: '#0B0C0E', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(HEX_COLOR)
  colorBg?: string | null;

  @ApiPropertyOptional({ example: '#15171A', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(HEX_COLOR)
  colorSurface?: string | null;

  @ApiPropertyOptional({ example: '#30343A', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(HEX_COLOR)
  colorBorder?: string | null;

  @ApiPropertyOptional({ example: '#D9F5F8', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(HEX_COLOR)
  colorAccent?: string | null;

  @ApiPropertyOptional({ example: '#F4FEFF', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(HEX_COLOR)
  colorAccentHover?: string | null;

  @ApiPropertyOptional({ example: '#F4F4F2', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(HEX_COLOR)
  colorText?: string | null;

  @ApiPropertyOptional({ example: '#B8BBC0', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(HEX_COLOR)
  colorTextSecondary?: string | null;

  @ApiPropertyOptional({ example: '#7C8188', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(HEX_COLOR)
  colorTextMuted?: string | null;

  @ApiPropertyOptional({ example: '#3DCC8C', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(HEX_COLOR)
  colorSuccess?: string | null;

  @ApiPropertyOptional({ example: '#FF626A', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(HEX_COLOR)
  colorDanger?: string | null;
}
