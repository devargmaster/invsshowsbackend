import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'juan@invs.app' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Contrase\u00f1a123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
