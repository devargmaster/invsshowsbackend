import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmtpProvider } from './smtp.provider';
import { ConsoleProvider } from './console.provider';
import { ResendProvider } from './resend.provider';
import type { IMailProvider, MailProviderType } from './mail-provider.interface';

/**
 * Factory que devuelve el proveedor de mail activo según MAIL_PROVIDER.
 * Mismo patrón que StreamingProviderFactory (streaming/providers/).
 */
@Injectable()
export class MailProviderFactory {
  private readonly logger = new Logger(MailProviderFactory.name);
  private readonly provider: IMailProvider;

  constructor(
    private readonly config: ConfigService,
    private readonly smtpProvider: SmtpProvider,
    private readonly consoleProvider: ConsoleProvider,
    private readonly resendProvider: ResendProvider,
  ) {
    const selected = (
      this.config.get<string>('mail.provider') ?? 'smtp'
    ).toLowerCase() as MailProviderType;

    switch (selected) {
      case 'console':
        this.provider = this.consoleProvider;
        break;
      case 'resend':
        this.provider = this.resendProvider;
        break;
      case 'smtp':
      default:
        this.provider = this.smtpProvider;
        break;
    }

    this.logger.log(`Proveedor de mail activo: ${this.provider.providerType.toUpperCase()}`);
  }

  getProvider(): IMailProvider {
    return this.provider;
  }
}
