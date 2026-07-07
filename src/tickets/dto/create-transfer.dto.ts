import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransferDto {
  @ApiProperty({ example: 'lucia.perez@gmail.com' })
  @IsEmail()
  toEmail: string;
}
