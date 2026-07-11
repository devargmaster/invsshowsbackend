import { Injectable } from '@nestjs/common';
import { Event, Recording, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AvailableAccess {
  /** true si una suscripción activa daría acceso a este contenido. */
  subscription: boolean;
  /** presente si el contenido también se vende suelto, con su precio. */
  purchase: { priceCents: number; currency: string } | null;
}

export interface ContentAccessResult {
  granted: boolean;
  availableAccess: AvailableAccess;
}

/**
 * Evalúa el acceso combinable a una pieza de contenido (grabación o el
 * "vivo" de un evento streaming): gratis, incluido en suscripción, y/o
 * comprado suelto — no son excluyentes entre sí, cualquiera alcanza.
 */
@Injectable()
export class ContentAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async checkRecordingAccess(
    userId: string,
    recording: Pick<Recording, 'id' | 'isFree' | 'includedInSubscription' | 'priceCents' | 'currency'>,
  ): Promise<ContentAccessResult> {
    const availableAccess: AvailableAccess = {
      subscription: recording.includedInSubscription,
      purchase: recording.priceCents != null ? { priceCents: recording.priceCents, currency: recording.currency } : null,
    };

    if (recording.isFree) {
      return { granted: true, availableAccess };
    }

    const granted =
      (recording.includedInSubscription && (await this.hasActiveSubscription(userId))) ||
      (await this.hasPaidPurchase(userId, { recordingId: recording.id }));

    return { granted, availableAccess };
  }

  async checkEventLiveAccess(
    userId: string,
    event: Pick<Event, 'id' | 'liveIsFree' | 'liveIncludedInSubscription' | 'livePriceCents' | 'liveCurrency'>,
  ): Promise<ContentAccessResult> {
    const availableAccess: AvailableAccess = {
      subscription: event.liveIncludedInSubscription,
      purchase: event.livePriceCents != null ? { priceCents: event.livePriceCents, currency: event.liveCurrency } : null,
    };

    if (event.liveIsFree) {
      return { granted: true, availableAccess };
    }

    const granted =
      (event.liveIncludedInSubscription && (await this.hasActiveSubscription(userId))) ||
      (await this.hasPaidPurchase(userId, { eventId: event.id }));

    return { granted, availableAccess };
  }

  private async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) return false;
    if (subscription.expiresAt && subscription.expiresAt < new Date()) {
      // Solo evaluamos acá, no mutamos el estado — a diferencia del viejo
      // SubscriptionGuard, este chequeo puede correr por cada ítem de un
      // listado y no tiene sentido escribir en cada uno.
      return false;
    }
    return true;
  }

  private async hasPaidPurchase(
    userId: string,
    target: { recordingId?: string; eventId?: string },
  ): Promise<boolean> {
    const purchase = await this.prisma.contentPurchase.findFirst({
      where: { userId, status: 'PAID', ...target },
    });
    return !!purchase;
  }
}
