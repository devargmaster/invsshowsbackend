import { Global, Module } from '@nestjs/common';
import { ContentAccessService } from './services/content-access.service';
import { SupabaseStorageService } from './services/supabase-storage.service';

/**
 * Servicios compartidos usados por guards que no pertenecen a un módulo
 * de dominio específico (ej: ContentAccessGuard, usado tanto en
 * streaming/ como en recordings/). Global para no tener que importarlo
 * en cada módulo que use esos guards — mismo criterio que PrismaModule.
 */
@Global()
@Module({
  providers: [ContentAccessService, SupabaseStorageService],
  exports: [ContentAccessService, SupabaseStorageService],
})
export class CommonModule {}
