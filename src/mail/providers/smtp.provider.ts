import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { IMailProvider, SendMailInput } from './mail-provider.interface';

@Injectable()
export class SmtpProvider implements IMailProvider {
  readonly providerType = 'smtp' as const;
  private readonly logger = new Logger(SmtpProvider.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    this.fromEmail = this.config.get<string>('mail.fromEmail') ?? 'no-reply@invs.app';
    this.fromName = this.config.get<string>('mail.fromName') ?? 'INVS';
  }

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('mail.smtp.host');
    const user = this.config.get<string>('mail.smtp.user');
    const pass = this.config.get<string>('mail.smtp.pass');

    if (!host || !user || !pass) {
      throw new Error(
        'SMTP no está configurado (faltan SMTP_HOST/SMTP_USER/SMTP_PASS). ' +
          'Configurá las variables de entorno o usá MAIL_PROVIDER=console para desarrollo.',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('mail.smtp.port') ?? 587,
      secure: this.config.get<boolean>('mail.smtp.secure') ?? false,
      auth: { user, pass },
    });

    return this.transporter;
  }

  async send(input: SendMailInput): Promise<void> {
    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    this.logger.log(`Mail enviado a ${input.to}: ${input.subject}`);
  }
}
