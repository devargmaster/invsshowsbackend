import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddVariantDto {
  @ApiProperty({ example: 'XL' })
  @IsString()
  @IsNotEmpty()
  label: string;
}
