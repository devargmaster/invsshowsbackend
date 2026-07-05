import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionStatus } from '@prisma/client';

// Planes disponibles (en producción esto podría venir de BD o config)
export const SUBSCRIPTION_PLANS = [
  {
    id: 'basic',
    name: 'INVS Basic',
    description: 'Acceso a biblioteca de grabaciones',
    features: ['Grabaciones históricas', 'Perfil básico'],
  },
  {
    id: 'premium',
    name: 'INVS Premium',
    description: 'Acceso completo: streaming en vivo + grabaciones + QR presencial',
    features: [
      'Streaming en vivo',
      'Biblioteca completa de grabaciones',
      'Entradas QR para eventos presenciales',
      'Acceso anticipado',
    ],
  },
];

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  getPlans() {
    return SUBSCRIPTION_PLANS;
  }

  async getMySubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!sub) throw new NotFoundException('No tienes una suscripción activa.');
    return sub;
  }

  async create(dto: CreateSubscriptionDto, requestingUserId: string, isAdmin: boolean) {
    const targetUserId = isAdmin && dto.userId ? dto.userId : requestingUserId;

    // Solo un admin puede fijar el status directamente (ej: ACTIVE).
    // Un usuario self-service NUNCA puede activarse solo: sin integración
    // de pago real, queda en PENDING hasta que un admin (o, a futuro, un
    // webhook de pago verificado) confirme la suscripción.
    const status = isAdmin ? (dto.status ?? SubscriptionStatus.ACTIVE) : SubscriptionStatus.PENDING;

    // Verificar si ya tiene suscripción activa
    const existing = await this.prisma.subscription.findUnique({
      where: { userId: targetUserId },
    });
    if (existing && existing.status === SubscriptionStatus.ACTIVE) {
      throw new ConflictException('El usuario ya tiene una suscripción activa.');
    }

    if (existing) {
      // Reactivar la existente
      return this.prisma.subscription.update({
        where: { id: existing.id },
        data: {
          planName: dto.planName,
          status,
          platform: dto.platform,
          externalId: dto.externalId,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          startsAt: new Date(),
        },
      });
    }

    return this.prisma.subscription.create({
      data: {
        userId: targetUserId,
        planName: dto.planName,
        status,
        platform: dto.platform,
        externalId: dto.externalId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async cancel(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException('No tienes una suscripción activa.');

    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.CANCELLED },
    });
  }

  // Admin: listar todas las suscripciones
  async findAll() {
    return this.prisma.subscription.findMany({
      include: { user: { select: { email: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
