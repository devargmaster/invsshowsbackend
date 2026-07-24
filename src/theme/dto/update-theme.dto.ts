import { IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const HEX_COLOR = /^#([0-9A-Fa-f]{3}){1,2}$/;

export class UpdateThemeDto {
  @ApiPropertyOptional({ example: '#0B0C0E' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorBg?: string;

  @ApiPropertyOptional({ example: '#15171A' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorSurface?: string;

  @ApiPropertyOptional({ example: '#30343A' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorBorder?: string;

  @ApiPropertyOptional({ example: '#D9F5F8' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorAccent?: string;

  @ApiPropertyOptional({ example: '#F4FEFF' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorAccentHover?: string;

  @ApiPropertyOptional({ example: '#F4F4F2' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorText?: string;

  @ApiPropertyOptional({ example: '#B8BBC0' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorTextSecondary?: string;

  @ApiPropertyOptional({ example: '#7C8188' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorTextMuted?: string;

  @ApiPropertyOptional({ example: '#3DCC8C' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorSuccess?: string;

  @ApiPropertyOptional({ example: '#FF626A' })
  @IsOptional()
  @Matches(HEX_COLOR)
  colorDanger?: string;
}
