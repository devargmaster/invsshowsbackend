import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IPaymentProvider, ChargeInput, ChargeResult } from './payment-provider.interface';

/**
 * Openpay Argentina (BBVA) — docs.ecommercebbva.com
 * Sandbox: sand-api.ecommercebbva.com · Producción: api.ecommercebbva.com
 *
 * La tokenización de la tarjeta se hace SIEMPRE del lado del cliente (con el
 * SDK/Checkout API de Openpay) — acá solo llega el token + device_session_id,
 * nunca el número de tarjeta.
 *
 * No valida nada en el constructor (igual que MuxProvider): si faltan
 * credenciales, falla recién al intentar cobrar, con un mensaje claro.
 */
@Injectable()
export class OpenpayProvider implements IPaymentProvider {
  readonly providerType = 'openpay' as const;
  private readonly logger = new Logger(OpenpayProvider.name);

  constructor(private readonly config: ConfigService) {}

  private getBaseUrl(): string {
    const production = this.config.get<boolean>('openpay.production') ?? false;
    return production ? 'https://api.ecommercebbva.com' : 'https://sand-api.ecommercebbva.com';
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    const merchantId = this.config.get<string>('openpay.merchantId');
    const privateKey = this.config.get<string>('openpay.privateKey');

    if (!merchantId || !privateKey) {
      throw new ServiceUnavailableException(
        'Openpay no está configurado (faltan OPENPAY_MERCHANT_ID/OPENPAY_PRIVATE_KEY). Contactá al administrador.',
      );
    }

    const url = `${this.getBaseUrl()}/v1/${merchantId}/charges`;
    const auth = Buffer.from(`${privateKey}:`).toString('base64');

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          method: 'card',
          source_id: input.cardToken,
          amount: Math.round(input.amountCents) / 100,
          currency: input.currency,
          description: input.description,
          order_id: input.orderId,
          device_session_id: input.deviceSessionId,
          customer: {
            name: input.customerName,
            email: input.customerEmail,
          },
        }),
      });
    } catch (err) {
      this.logger.error(`[Openpay] Error de red al cobrar orden ${input.orderId}: ${(err as Error).message}`);
      return { success: false, errorMessage: 'No se pudo contactar al procesador de pagos.' };
    }

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      const message =
        (data.description as string) ?? (data.error_message as string) ?? 'Pago rechazado.';
      this.logger.warn(`[Openpay] Cargo rechazado para orden ${input.orderId}: ${message}`);
      return { success: false, errorMessage: message };
    }

    this.logger.log(`[Openpay] Cargo exitoso para orden ${input.orderId}: ${data.id}`);
    return { success: true, chargeId: data.id as string };
  }
}
