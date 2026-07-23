import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PaymentSettingsService } from '../../payment-settings/payment-settings.service';

const PROVIDER_KEY = 'mercadopago';
const MP_API_BASE = 'https://api.mercadopago.com';

/**
 * Mercado Pago — Checkout Pro (redirect a la página de pago hosteada por MP,
 * confirmación asíncrona por webhook). A diferencia de Openpay, este
 * provider NO implementa IPaymentProvider (esa interfaz asume tokenización
 * de tarjeta del lado del cliente y cobro síncrono, que no aplica acá) — es
 * un servicio hermano con su propio contrato, pensado para poder migrar a
 * Checkout Bricks más adelante sin tocar el resto del flujo de órdenes.
 *
 * Las credenciales NO viven en variables de entorno: se leen en cada
 * request desde PaymentSettingsService (configurables desde el backoffice).
 */
export interface CreatePreferenceInput {
  /** 'order:<uuid>' | 'content:<uuid>' — para que el webhook sepa a qué confirmar */
  externalReference: string;
  amountCents: number;
  currency: string;
  title: string;
  payerEmail: string;
  /** Path relativo en invs-web al que MP redirige de vuelta, ej. `/checkout/confirmacion/<id>` */
  returnPath: string;
}

export interface CreatePreferenceResult {
  redirectUrl: string;
  preferenceId: string;
}

export interface MercadoPagoPaymentInfo {
  status: string; // 'approved' | 'rejected' | 'pending' | 'in_process' | 'cancelled' | 'refunded'
  externalReference: string | null;
}

@Injectable()
export class MercadoPagoProvider {
  private readonly logger = new Logger(MercadoPagoProvider.name);

  constructor(
    private readonly config: ConfigService,
    private readonly paymentSettings: PaymentSettingsService,
  ) {}

  async createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceResult> {
    const { accessToken, environment } = await this.paymentSettings.getDecryptedAccessToken(PROVIDER_KEY);
    const webBaseUrl = this.config.get<string>('webBaseUrl');
    const apiBaseUrl = this.config.get<string>('apiBaseUrl');
    const returnUrl = `${webBaseUrl}${input.returnPath}`;
    // Mercado Pago rechaza auto_return si back_urls.success no es una URL
    // pública real (ej. localhost en desarrollo) — sin esto, auto_return
    // ni siquiera puede mandarse en ese caso ("back_url.success must be
    // defined"). En local el usuario simplemente vuelve manualmente desde
    // la página de éxito de MP.
    const canAutoReturn = /^https:\/\//.test(returnUrl);

    let response: Response;
    try {
      response = await fetch(`${MP_API_BASE}/checkout/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          items: [
            {
              title: input.title,
              quantity: 1,
              unit_price: Math.round(input.amountCents) / 100,
              currency_id: input.currency,
            },
          ],
          payer: { email: input.payerEmail },
          external_reference: input.externalReference,
          back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
          ...(canAutoReturn ? { auto_return: 'approved' } : {}),
          // apiBaseUrl es solo host — el prefijo global "api/v1" (main.ts)
          // no está incluido, hay que agregarlo a mano acá.
          notification_url: `${apiBaseUrl}/api/v1/payments/mercadopago/webhook`,
        }),
      });
    } catch (err) {
      this.logger.error(`[MercadoPago] Error de red al crear preferencia: ${(err as Error).message}`);
      throw new ServiceUnavailableException('No se pudo contactar a Mercado Pago.');
    }

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const message = (data.message as string) ?? 'Mercado Pago rechazó la solicitud.';
      this.logger.warn(`[MercadoPago] Error creando preferencia: ${message}`);
      throw new ServiceUnavailableException(message);
    }

    const redirectUrl = (environment === 'production' ? data.init_point : data.sandbox_init_point) as string;
    return { redirectUrl, preferenceId: data.id as string };
  }

  async getPayment(paymentId: string): Promise<MercadoPagoPaymentInfo> {
    const { accessToken } = await this.paymentSettings.getDecryptedAccessToken(PROVIDER_KEY);

    const response = await fetch(`${MP_API_BASE}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new ServiceUnavailableException('No se pudo consultar el pago en Mercado Pago.');
    }

    return {
      status: data.status as string,
      externalReference: (data.external_reference as string) ?? null,
    };
  }

  /**
   * Verifica el header x-signature de los webhooks de Mercado Pago.
   * Formato: "ts=<timestamp>,v1=<hmac hex>". Manifest a firmar:
   * "id:<dataId>;request-id:<x-request-id>;ts:<ts>;" — HMAC-SHA256 con la
   * clave secreta de webhooks (distinta del access token).
   * Docs: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
   *
   * TODO: probado en homologación (preferencia real → checkout sandbox →
   * pago aprobado → webhook entregado a nuestro endpoint, confirmado con
   * ngrok), pero la firma nunca valida con la "Clave secreta" de la pestaña
   * "Modo de prueba" del panel de Webhooks — se verificó a mano recalculando
   * el HMAC contra un request real capturado y no matchea con ningún formato
   * de manifest razonable, así que no parece ser un bug de esta función.
   * Pendiente de investigar con soporte de Mercado Pago o el simulador
   * oficial de notificaciones antes de confiar en la confirmación automática
   * vía webhook en producción.
   */
  async verifyWebhookSignature(headers: {
    'x-signature'?: string;
    'x-request-id'?: string;
  }, dataId: string): Promise<boolean> {
    const secret = await this.paymentSettings.getDecryptedWebhookSecret(PROVIDER_KEY);
    if (!secret) {
      this.logger.warn('[MercadoPago] No hay webhook secret configurado — no se puede verificar la firma.');
      return false;
    }

    const signatureHeader = headers['x-signature'];
    const requestId = headers['x-request-id'];
    if (!signatureHeader || !requestId) return false;

    const parts = Object.fromEntries(
      signatureHeader.split(',').map((p) => {
        const [k, v] = p.split('=');
        return [k?.trim(), v?.trim()];
      }),
    );
    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(v1);

    return expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf);
  }
}
