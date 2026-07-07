import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// La generación de tickets ya no vive acá: ahora se crean vía POST /orders
// (carrito de categorías + adicionales + pago/transferencia). Este módulo
// se enfoca en consultar, validar y transferir entradas ya emitidas.

export class ValidateTicketDto {
  @ApiProperty({ description: 'El JSON completo escaneado del QR (qrPayload del ticket)' })
  @IsString()
  @IsNotEmpty()
  qrPayload: string;
}
