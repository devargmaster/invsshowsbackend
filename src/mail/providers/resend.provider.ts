import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IMailProvider, SendMailInput } from './mail-provider.interface';

/**
 * Proveedor vía API HTTP de Resend (https://resend.com/docs/api-reference).
 * Se usa en lugar de SMTP porque los puertos 465/587 dan timeouts
 * intermitentes desde hostings cloud (visto en Railway); la API va por
 * HTTPS (443) y no tiene ese problema.
 */
@Injectable()
export class ResendProvider implements IMailProvider {
  readonly providerType = 'resend' as const;
  private readonly logger = new Logger(ResendProvider.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly apiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.fromEmail = this.config.get<string>('mail.fromEmail') ?? 'no-reply@invs.app';
    this.fromName = this.config.get<string>('mail.fromName') ?? 'INVS';
    this.apiKey = this.config.get<string>('mail.resend.apiKey');
  }

  async send(input: SendMailInput): Promise<void> {
    if (!this.apiKey) {
      throw new Error(
        'Resend no está configurado (falta RESEND_API_KEY). ' +
          'Configurá la variable de entorno o usá MAIL_PROVIDER=console para desarrollo.',
      );
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content.toString('base64'),
          content_type: a.contentType,
          content_id: a.cid,
        })),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend respondió ${res.status}: ${body}`);
    }

    this.logger.log(`Mail enviado a ${input.to}: ${input.subject}`);
  }
}
