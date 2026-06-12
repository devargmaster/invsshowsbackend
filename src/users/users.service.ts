import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';

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
}
