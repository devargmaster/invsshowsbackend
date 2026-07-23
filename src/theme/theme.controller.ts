import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ThemeService } from './theme.service';

// Público, sin ningún guard a propósito: invs-web lo consume sin login.
// apiClient.ts de ambos frontends redirige a /login ante cualquier 401 —
// guardear esta ruta por error rompería la navegación anónima del sitio.
@ApiTags('Theme')
@Controller('theme')
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @Get()
  @ApiOperation({ summary: 'Paleta de colores activa (público)' })
  get() {
    return this.themeService.getEffective();
  }
}
