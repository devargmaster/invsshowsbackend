import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { SmtpProvider } from './providers/smtp.provider';
import { ConsoleProvider } from './providers/console.provider';
import { ResendProvider } from './providers/resend.provider';
import { MailProviderFactory } from './providers/mail-provider.factory';

@Global()
@Module({
  providers: [SmtpProvider, ConsoleProvider, ResendProvider, MailProviderFactory, MailService],
  exports: [MailService],
})
export class MailModule {}
