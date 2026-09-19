import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RejectAccessRequestDto {
  @ApiPropertyOptional({ example: 'No coincide con la lista de acreditados.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
