import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ description: 'ID token de Google obtenido del lado del cliente (Google Identity Services / expo-auth-session).' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
