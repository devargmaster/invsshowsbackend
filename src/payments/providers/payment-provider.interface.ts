/**
 * Contrato que deben implementar todos los proveedores de pago.
 * Agregar un nuevo proveedor (ej: otro PSP) = crear una clase que implemente
 * esta interfaz y registrarla en PaymentProviderFactory. Mismo patrón que
 * streaming/providers y mail/providers.
 */

export type PaymentProviderType = 'openpay';

export interface ChargeInput {
  orderId: string;
  amountCents: number;
  currency: string;
  /** Token de tarjeta generado del lado del cliente (nunca llega el número de tarjeta al backend) */
  cardToken: string;
  /** Device session ID antifraude, generado por el SDK del proveedor en el cliente */
  deviceSessionId: string;
  customerEmail: string;
  customerName: string;
  description: string;
}

export interface ChargeResult {
  success: boolean;
  chargeId?: string;
  errorMessage?: string;
}

export interface IPaymentProvider {
  readonly providerType: PaymentProviderType;
  charge(input: ChargeInput): Promise<ChargeResult>;
}
