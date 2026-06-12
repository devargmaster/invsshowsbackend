import { Module } from '@nestjs/common';
import { StreamingService } from './streaming.service';
import { StreamingController } from './streaming.controller';
import { MuxProvider } from './providers/mux.provider';
import { YouTubeProvider } from './providers/youtube.provider';
import { StreamingProviderFactory } from './providers/streaming-provider.factory';

@Module({
  controllers: [StreamingController],
  providers: [
    // Registrar todos los proveedores disponibles
    MuxProvider,
    YouTubeProvider,
    // La factory elige cuál activar según STREAMING_PROVIDER en .env
    StreamingProviderFactory,
    StreamingService,
  ],
  exports: [StreamingService, StreamingProviderFactory],
})
export class StreamingModule {}
