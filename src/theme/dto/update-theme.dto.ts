import { IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const HEX_COLOR = /^#([0-9A-Fa-f]{3}){1,2}$/;

export class UpdateThemeDto {
  @ApiPropertyOptional({ example: '#0B0B12' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorBg?: string;

  @ApiPropertyOptional({ example: '#13131F' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorSurface?: string;

  @ApiPropertyOptional({ example: '#1E1E33' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorBorder?: string;

  @ApiPropertyOptional({ example: '#A78BFA' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorAccent?: string;

  @ApiPropertyOptional({ example: '#8B5CF6' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorAccentHover?: string;

  @ApiPropertyOptional({ example: '#F0F0F5' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorText?: string;

  @ApiPropertyOptional({ example: '#C4C4D4' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorTextSecondary?: string;

  @ApiPropertyOptional({ example: '#8F8FA3' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorTextMuted?: string;

  @ApiPropertyOptional({ example: '#22C55E' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorSuccess?: string;

  @ApiPropertyOptional({ example: '#EF4444' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorDanger?: string;
}
