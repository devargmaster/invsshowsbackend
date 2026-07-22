import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { EventsModule } from './events/events.module';
import { TicketsModule } from './tickets/tickets.module';
import { StreamingModule } from './streaming/streaming.module';
import { RecordingsModule } from './recordings/recordings.module';
import { CategoriesModule } from './categories/categories.module';
import { AddonsModule } from './addons/addons.module';
import { MailModule } from './mail/mail.module';
import { PaymentsModule } from './payments/payments.module';
import { PaymentSettingsModule } from './payment-settings/payment-settings.module';
import { MercadoPagoWebhookModule } from './payments/mercadopago-webhook.module';
import { OrdersModule } from './orders/orders.module';
import { ContentPurchasesModule } from './content-purchases/content-purchases.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    // Rate limiting: 'api' = límite general, 'auth' = más estricto (anti-brute force)
    ThrottlerModule.forRoot([
      {
        name: 'api',
        ttl: 60_000,  // ventana de 1 minuto
        limit: 60,    // 60 req/min por IP
      },
      {
        name: 'auth',
        ttl: 60_000,  // ventana de 1 minuto
        limit: 10,    // 10 req/min por IP (login, register, refresh)
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    SubscriptionsModule,
    EventsModule,
    TicketsModule,
    StreamingModule,
    RecordingsModule,
    CategoriesModule,
    AddonsModule,
    MailModule,
    PaymentsModule,
    PaymentSettingsModule,
    MercadoPagoWebhookModule,
    OrdersModule,
    ContentPurchasesModule,
  ],
  providers: [
    // Aplica ThrottlerGuard globalmente a todas las rutas
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
