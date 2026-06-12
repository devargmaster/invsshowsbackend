import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard que verifica que el usuario tenga una suscripción activa.
 * Aplica a rutas de streaming y grabaciones premium.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('No autenticado.');
    }

    // ADMIN y STAFF siempre tienen acceso
    if (user.role === 'ADMIN' || user.role === 'STAFF') {
      return true;
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new ForbiddenException(
        'Este contenido requiere una suscripción activa.',
      );
    }

    // Verificar vencimiento si tiene expiresAt
    if (subscription.expiresAt && subscription.expiresAt < new Date()) {
      // Marcar como expirada
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
      throw new ForbiddenException('Tu suscripción ha vencido.');
    }

    return true;
  }
}
