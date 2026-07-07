import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAddonDto } from './create-addon.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// El manejo de variantes en update queda fuera de este DTO a propósito:
// se agregan/eliminan con endpoints dedicados (POST/DELETE .../variants)
// para no pisar referencias de OrderAddon ya existentes.
export class UpdateAddonDto extends PartialType(
  OmitType(CreateAddonDto, ['variants'] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
