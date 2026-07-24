import { Controller, Get, Patch, Body, Param, ParseEnumPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ThemeModule as ThemeModuleEnum, UserRole } from '@prisma/client';
import { ThemeService } from './theme.service';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { UpdateThemeModuleDto } from './dto/update-theme-module.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Theme')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/theme')
export class AdminThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @Patch()
  @ApiOperation({ summary: '[Admin] Configurar la paleta de colores global' })
  upsert(@CurrentUser('id') adminId: string, @Body() dto: UpdateThemeDto) {
    return this.themeService.upsert(adminId, dto);
  }

  @Get('modules')
  @ApiOperation({ summary: '[Admin] Overrides crudos por módulo (invs-web), con null donde hereda el global' })
  getModules() {
    return this.themeService.getAllModuleOverridesRaw();
  }

  @Patch('modules/:module')
  @ApiOperation({ summary: '[Admin] Reemplazar el override de paleta de un módulo de invs-web' })
  upsertModule(
    @CurrentUser('id') adminId: string,
    @Param('module', new ParseEnumPipe(ThemeModuleEnum)) module: ThemeModuleEnum,
    @Body() dto: UpdateThemeModuleDto,
  ) {
    return this.themeService.upsertModuleOverride(adminId, module, dto);
  }
}
