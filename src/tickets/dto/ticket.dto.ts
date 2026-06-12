import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ example: 'evt-uuid-here', description: 'ID del evento para el que se genera el ticket' })
  @IsString()
  @IsNotEmpty()
  eventId: string;
}

export class ValidateTicketDto {
  @ApiProperty({ description: 'El JSON completo escaneado del QR (qrPayload del ticket)' })
  @IsString()
  @IsNotEmpty()
  qrPayload: string;
}
