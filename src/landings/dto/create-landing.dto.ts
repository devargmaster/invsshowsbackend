import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LandingStatus } from '@prisma/client';
import { LandingBlockDto } from './landing-block.dto';

export class CreateLandingDto {
  @ApiProperty({ example: 'invs-live-session-7' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug solo puede tener minúsculas, números y guiones (ej: mi-landing-2).',
  })
  slug: string;

  @ApiPropertyOptional({ enum: LandingStatus, default: LandingStatus.DRAFT })
  @IsOptional()
  @IsEnum(LandingStatus)
  status?: LandingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoOgImage?: string;

  @ApiProperty({ type: [LandingBlockDto] })
  @IsArray()
  @ArrayMaxSize(60) // guardarraíl razonable, no una landing con 500 bloques por error
  @ValidateNested({ each: true })
  @Type(() => LandingBlockDto)
  blocks: LandingBlockDto[];

  @ApiPropertyOptional({ description: 'CSS acotado a esta landing (escape hatch, ver docs de producto)' })
  @IsOptional()
  @IsString()
  customCss?: string;
}
