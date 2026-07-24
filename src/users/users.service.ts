import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    const { passwordHash, refreshToken, ...safe } = user;
    return safe;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    const { passwordHash, refreshToken, ...safe } = user;
    return safe;
  }

  // Admin: listar todos los usuarios
  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        subscription: { select: { status: true, planName: true, expiresAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  }

  // Admin: cambiar rol
  async changeRole(targetId: string, role: UserRole) {
    const user = await this.prisma.user.update({
      where: { id: targetId },
      data: { role },
    });
    const { passwordHash, refreshToken, ...safe } = user;
    return safe;
  }

  // ─── Admin: gestión de cuentas ADMIN/STAFF únicamente ─────────────
  // A propósito NUNCA toca cuentas con rol USER: la comunidad se resetea
  // su propia contraseña por mail (ver AuthService.forgotPassword/
  // resetPassword) — ni admin ni staff deben poder afectar cómo un
  // usuario de la comunidad entra a su cuenta.
  private async assertManageableTarget(targetId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Usuario no encontrado.');
    if (target.role === UserRole.USER) {
      throw new ForbiddenException(
        'No se puede gestionar una cuenta de la comunidad desde acá — esa persona tiene que usar "Olvidé mi contraseña" en invs-web.',
      );
    }
    return target;
  }

  async resetPasswordAdmin(targetId: string) {
    const target = await this.assertManageableTarget(targetId);

    const newPassword = crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: target.id },
      data: { passwordHash, refreshToken: null },
    });

    // Se devuelve en texto plano una sola vez — no se guarda en ningún
    // lado, es responsabilidad del admin pasársela a la persona por un
    // canal seguro (no queda logueada ni recuperable después de esto).
    return { email: target.email, newPassword };
  }

  async removeAdmin(requestingUserId: string, targetId: string) {
    if (requestingUserId === targetId) {
      throw new BadRequestException('No podés eliminar tu propia cuenta desde acá.');
    }
    await this.assertManageableTarget(targetId);

    try {
      await this.prisma.user.delete({ where: { id: targetId } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException(
          'No se puede eliminar: esta cuenta tiene acciones registradas (aprobaciones, cambios de configuración, etc). Cambiale el rol a USER en su lugar si querés quitarle el acceso.',
        );
      }
      throw e;
    }
  }
}
