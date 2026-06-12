import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'juan@invs.app' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Contrase\u00f1a123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;
}
