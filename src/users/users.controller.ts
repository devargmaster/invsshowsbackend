import { Controller, Get, Patch, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findMe(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Actualizar perfil propio' })
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(userId, dto);
  }

  // ── Admin endpoints ────────────────────────────────────────────
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Listar todos los usuarios' })
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Cambiar rol de un usuario' })
  changeRole(@Param('id') id: string, @Body('role') role: UserRole) {
    return this.usersService.changeRole(id, role);
  }

  @Post(':id/reset-password')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Resetear la contraseña de una cuenta ADMIN/STAFF (nunca de la comunidad)' })
  resetPassword(@Param('id') id: string) {
    return this.usersService.resetPasswordAdmin(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Eliminar una cuenta ADMIN/STAFF (nunca de la comunidad)' })
  remove(@Param('id') id: string, @CurrentUser('id') requestingUserId: string) {
    return this.usersService.removeAdmin(requestingUserId, id);
  }
}
