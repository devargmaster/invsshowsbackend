import { Module } from '@nestjs/common';
import { ThemeService } from './theme.service';
import { ThemeController } from './theme.controller';
import { AdminThemeController } from './admin-theme.controller';

@Module({
  controllers: [ThemeController, AdminThemeController],
  providers: [ThemeService],
  exports: [ThemeService],
})
export class ThemeModule {}
