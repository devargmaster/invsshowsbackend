import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Comprobantes de transferencia (./uploads) — servidos fuera del prefijo
  // /api/v1. NOTA: disco local, en Railway es efímero; reemplazar por
  // storage real (S3/Cloudinary) antes de depender de esto en producción.
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3000;
  const nodeEnv = config.get<string>('nodeEnv') ?? 'development';
  const corsOrigins = config.get<string[]>('cors.origins') ?? [];

  // ── Security ─────────────────────────────────────────────────────
  app.use(helmet());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.use(cookieParser());

  // ── Global prefix ────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Validation ───────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // Elimina props no declaradas en DTO
      forbidNonWhitelisted: true,
      transform: true,         // Transforma payloads al tipo del DTO
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global exception filter ──────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Swagger (solo en desarrollo) ─────────────────────────────────
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('INVS API')
      .setDescription('Backend API para la plataforma de eventos INVS')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Auth', 'Autenticación y tokens')
      .addTag('Users', 'Gestión de usuarios')
      .addTag('Subscriptions', 'Suscripciones y planes')
      .addTag('Events', 'Eventos presenciales, streaming e híbridos')
      .addTag('Tickets / QR', 'Generación y validación de entradas QR')
      .addTag('Streaming', 'Streaming en vivo con Mux')
      .addTag('Recordings', 'Biblioteca de grabaciones')
      .addTag('Ticket Categories', 'Categorías de entrada por evento (precio, aforo, horario propio)')
      .addTag('Add-ons', 'Adicionales de la experiencia (remeras, cuadros, conmemorativos)')
      .addTag('Orders', 'Compra de entradas: carrito, pago, transferencia')
      .addTag('Content Purchases', 'Compra individual de contenido: grabaciones y vivo pay-per-view')
      .addTag('Payments', 'Webhooks de proveedores de pago')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log(`Swagger disponible en: http://localhost:${port}/docs`);
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 INVS API corriendo en: puerto ${port} (0.0.0.0)/api/v1`);
  logger.log(`Entorno: ${nodeEnv}`);
}

bootstrap();
