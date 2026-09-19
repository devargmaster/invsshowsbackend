import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveAccessRequestDto {
  @ApiProperty({ example: 'category-uuid', description: 'Categoría de entrada que se le asigna a la persona' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;
}
