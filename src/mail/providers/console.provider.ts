import { Injectable, Logger } from '@nestjs/common';
import type { IMailProvider, SendMailInput } from './mail-provider.interface';

/**
 * Proveedor de desarrollo: solo loguea el mail, no lo envía de verdad.
 * Se activa explícitamente con MAIL_PROVIDER=console — nunca como fallback
 * silencioso si falta configuración de SMTP.
 */
@Injectable()
export class ConsoleProvider implements IMailProvider {
  readonly providerType = 'console' as const;
  private readonly logger = new Logger(ConsoleProvider.name);

  async send(input: SendMailInput): Promise<void> {
    const adjuntos = input.attachments?.length
      ? ` | Adjuntos: ${input.attachments.map((a) => a.filename).join(', ')}`
      : '';
    this.logger.log(
      `[MAIL:console] Para: ${input.to} | Asunto: ${input.subject}${adjuntos}\n${input.text ?? input.html}`,
    );
  }
}
