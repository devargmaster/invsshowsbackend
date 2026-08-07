import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ManualLiveProvider } from '@prisma/client';

// Cortar la transmisión es mandar el body sin `videoUrl` (u omitido) —
// no hay un DTO separado para "apagar", es el mismo endpoint con menos.
export class SetManualLiveDto {
  @ApiPropertyOptional({ enum: ManualLiveProvider, description: 'Requerido junto con videoUrl para poner en vivo' })
  @IsOptional()
  @IsEnum(ManualLiveProvider)
  provider?: ManualLiveProvider;

  @ApiPropertyOptional({
    example: 'https://www.youtube.com/watch?v=... o https://www.twitch.tv/tu_canal',
    description: 'Ausente/vacío para cortar la transmisión',
  })
  @IsOptional()
  @IsString()
  videoUrl?: string;
}
