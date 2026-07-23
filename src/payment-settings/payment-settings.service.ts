import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret, decryptSecret, lastFourOf } from '../common/utils/credentials-crypto.util';
import { UpsertPaymentSettingsDto } from './dto/upsert-payment-settings.dto';

/**
 * Credenciales de proveedores de pago configurables desde el backoffice
 * (hoy solo Mercado Pago), en vez de fijas en variables de entorno — un solo
 * registro por proveedor, reemplazable por cualquier ADMIN sin redeploy.
 */
@Injectable()
export class PaymentSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Uso desde el backoffice: nunca devuelve ningún secreto ─────
  async getPublic(provider: string) {
    const settings = await this.prisma.paymentSettings.findUnique({ where: { provider } });
    if (!settings) {
      return { configured: false, environment: null, publicKey: null, lastFour: null, webhookConfigured: false };
    }
    return {
      configured: true,
      environment: settings.environment,
      publicKey: settings.publicKey,
      lastFour: settings.lastFour,
      webhookConfigured: !!settings.webhookSecretCipher,
    };
  }

  // ─── Uso interno del provider al momento de crear la preferencia ────
  async getDecryptedAccessToken(provider: string): Promise<{ accessToken: string; environment: string }> {
    const settings = await this.prisma.paymentSettings.findUnique({ where: { provider } });
    if (!settings) {
      throw new ServiceUnavailableException(
        `${provider} no está configurado todavía. Cargá la credencial desde el backoffice.`,
      );
    }
    return { accessToken: decryptSecret(settings.accessTokenCipher), environment: settings.environment };
  }

  // ─── Uso interno del webhook, para verificar la firma ───────────
  async getDecryptedWebhookSecret(provider: string): Promise<string | null> {
    const settings = await this.prisma.paymentSettings.findUnique({ where: { provider } });
    if (!settings?.webhookSecretCipher) return null;
    return decryptSecret(settings.webhookSecretCipher);
  }

  async upsert(provider: string, adminId: string, dto: UpsertPaymentSettingsDto) {
    const existing = await this.prisma.paymentSettings.findUnique({ where: { provider } });

    if (!dto.accessToken && !existing) {
      throw new NotFoundException(`Todavía no hay ninguna credencial de ${provider} guardada.`);
    }

    const tokenFields = dto.accessToken
      ? { accessTokenCipher: encryptSecret(dto.accessToken), lastFour: lastFourOf(dto.accessToken) }
      : undefined;
    const webhookFields = dto.webhookSecret ? { webhookSecretCipher: encryptSecret(dto.webhookSecret) } : undefined;

    if (existing) {
      await this.prisma.paymentSettings.update({
        where: { provider },
        data: {
          environment: dto.environment,
          publicKey: dto.publicKey,
          updatedByUserId: adminId,
          ...tokenFields,
          ...webhookFields,
        },
      });
    } else {
      // dto.accessToken está garantizado acá (guard de arriba: sin registro previo, hace falta el token).
      await this.prisma.paymentSettings.create({
        data: {
          provider,
          environment: dto.environment,
          publicKey: dto.publicKey,
          updatedByUserId: adminId,
          ...tokenFields!,
          ...webhookFields,
        },
      });
    }

    return this.getPublic(provider);
  }
}
