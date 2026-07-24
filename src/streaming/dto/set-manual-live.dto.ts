import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Cortar la transmisión es mandar el body sin `videoUrl` (u omitido) —
// no hay un DTO separado para "apagar", es el mismo endpoint con menos.
export class SetManualLiveDto {
  @ApiPropertyOptional({ example: 'https://www.youtube.com/watch?v=...', description: 'Ausente/vacío para cortar la transmisión' })
  @IsOptional()
  @IsString()
  videoUrl?: string;
}
