import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenpayProvider } from './openpay.provider';
import type { IPaymentProvider, PaymentProviderType } from './payment-provider.interface';

/**
 * Factory que devuelve el proveedor de pago activo según PAYMENT_PROVIDER.
 * Mismo patrón que StreamingProviderFactory y MailProviderFactory — sumar
 * otro PSP a futuro es agregar una clase nueva, no reescribir nada.
 */
@Injectable()
export class PaymentProviderFactory {
  private readonly logger = new Logger(PaymentProviderFactory.name);
  private readonly provider: IPaymentProvider;

  constructor(
    private readonly config: ConfigService,
    private readonly openpayProvider: OpenpayProvider,
  ) {
    const selected = (
      this.config.get<string>('payments.provider') ?? 'openpay'
    ).toLowerCase() as PaymentProviderType;

    switch (selected) {
      case 'openpay':
      default:
        this.provider = this.openpayProvider;
        break;
    }

    this.logger.log(`Proveedor de pagos activo: ${this.provider.providerType.toUpperCase()}`);
  }

  getProvider(): IPaymentProvider {
    return this.provider;
  }
}
