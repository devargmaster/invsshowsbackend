import { Controller, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ThemeService } from './theme.service';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

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
}
