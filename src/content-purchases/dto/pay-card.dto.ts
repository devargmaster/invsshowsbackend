import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PayCardDto {
  @ApiProperty({ description: 'Token de tarjeta generado del lado del cliente con el Checkout de Openpay' })
  @IsString()
  @IsNotEmpty()
  cardToken: string;

  @ApiProperty({ description: 'Device session ID antifraude, generado por el SDK de Openpay en el cliente' })
  @IsString()
  @IsNotEmpty()
  deviceSessionId: string;
}
