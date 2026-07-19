# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es esto

API REST de INVS (Panda Estudios), una plataforma de eventos con entradas
QR, compra múltiple con adicionales, transferencia de entradas, streaming
en vivo (Mux) y venta de contenido/grabaciones. NestJS 10 + Prisma 5 +
PostgreSQL. Es uno de 4 repos hermanos del proyecto (`invs-web`,
`invs-backoffice`, `invs-mobile-mvp-fixed` viven en el directorio padre);
este repo es solo el backend.

## Comandos

```bash
npm run start:dev          # dev con watch, puerto 3000, prefijo /api/v1
npm run build               # nest build
npm run lint                 # eslint --fix sobre src/apps/libs/test
npm run prisma:generate
npm run prisma:migrate:dev  # crea + aplica migración en dev
npm run prisma:migrate:deploy  # aplica migraciones pendientes (se corre en el Dockerfile en cada deploy)
npm run prisma:studio
npm run prisma:seed          # ts-node prisma/seed.ts — crea admin@invs.app/staff@invs.app/demo@invs.app
```

No hay suite de tests configurada (sin `.spec.ts`, sin script `test` en
`package.json`) — no asumir que existe cobertura automática al hacer
cambios.

Desarrollo local con Docker:
```bash
docker-compose up postgres -d
npm run prisma:migrate:dev && npm run prisma:seed && npm run start:dev
```
Swagger disponible solo fuera de producción en `http://localhost:3000/docs`.

## Arquitectura

**Providers intercambiables por factory + variable de entorno.** Tres
subsistemas usan el mismo patrón — interfaz + implementaciones + factory
que elige según config, para no acoplar el dominio a un proveedor externo:
- `mail/providers/`: `smtp`, `console` (dev), `resend` — elegido por
  `MAIL_PROVIDER`. `ResendProvider` usa la API HTTP de Resend (no SMTP)
  porque Railway tenía timeouts intermitentes por SMTP.
- `payments/providers/`: `openpay` — elegido por `PAYMENT_PROVIDER`.
- `streaming/providers/`: `mux`, `youtube` — elegido por
  `STREAMING_PROVIDER`.

Al agregar un proveedor nuevo a cualquiera de los tres, implementar la
interfaz correspondiente (`*-provider.interface.ts`) y registrarlo en el
factory del módulo, no ramificar con `if` en el service que lo consume.

**Auth y autorización.** JWT access (15 min) + refresh token (30 días,
cookie HttpOnly) — guards en `auth/guards/` (`jwt-auth`, `jwt-refresh`).
Autorización por rol vía `@Roles(...)` (`common/decorators/roles.decorator.ts`)
+ `RolesGuard` (`common/guards/roles.guard.ts`), que lee `user.role` seteado
por la estrategia JWT. Roles: `ADMIN`, `STAFF`, `USER` (`UserRole` en
Prisma). Rutas de streaming/VOD además usan `ContentAccessGuard`
(`common/guards/content-access.guard.ts`) para chequear que el usuario
compró o está suscripto al contenido pedido.

**QR de entradas firmado con HMAC, no un ID plano.** `common/utils/qr-signer.util.ts`
firma `{ticketId, eventId, categoryId, issuedAt, expiresAt}` con
HMAC-SHA256 (`QR_HMAC_SECRET`); `tickets.service.ts` recalcula la firma al
validar. El estado de la entrada (`TicketStatus`) es lo que determina si es
canjeable, no un flag `used: boolean` — evita condiciones de carrera al
validar dos scans simultáneos del mismo QR (se corrige con `updateMany`
atómico condicionado por estado, no con un `findUnique` + `update` separados).

**Modelo de compra**: `Order` (con `OrderStatus`: pago con tarjeta,
transferencia bancaria con comprobante subido a `./uploads` y aprobación
manual de un admin desde backoffice, o vencimiento automático) contiene
`Ticket`s por `TicketCategory` (cada categoría tiene su propio horario/aforo
dentro del mismo evento, no hay un aforo global) y `OrderAddon`s
(adicionales tipo remera con `AddonVariant` por talle). El aforo se
reserva de forma atómica al crear la orden para evitar sobreventa
concurrente. `OrdersCleanupService` es un cron (`@nestjs/schedule`) que
vence órdenes pendientes de pago/transferencia después de
`CARD_ORDER_TTL_MINUTES` / `TRANSFER_ORDER_TTL_HOURS`.

**Transferencia de entradas entre usuarios**: `TicketTransfer` con su
propio `TicketTransferStatus` — compartir por email, con aceptación
(registro inline si el destinatario no tiene cuenta) o rechazo. Los
adicionales de una orden se canjean en el evento independientemente de
quién sea el comprador (decisión de producto: la remera no está
personalizada), con `redeemedCount` en `OrderAddon` protegido contra
doble entrega igual que la validación de QR.

**Base de datos = Supabase Postgres, accedida solo vía Prisma.** El
`DATABASE_URL` de producción usa el connection pooler de Supabase (puerto
6543, usuario `postgres.<project-ref>`). Row-Level Security está
habilitado (sin políticas) en todas las tablas de `public` para que el
linter de seguridad de Supabase no marque las tablas como públicamente
accesibles vía su Data API — esto no afecta a Prisma porque Railway
conecta con el rol `postgres`, dueño de las tablas, que bypasea RLS. **Al
escribir una migración que cree una tabla nueva, agregar
`ALTER TABLE "..." ENABLE ROW LEVEL SECURITY;` al final del SQL de esa
migración**, si no la tabla nueva queda expuesta hasta que alguien se dé
cuenta por el linter.

**Uploads de comprobantes de transferencia van a disco local**
(`./uploads`, servido en `/uploads` fuera del prefijo `/api/v1`) — en
Railway el filesystem es efímero, así que un redeploy los borra. Está
marcado en `main.ts` como pendiente de reemplazar por storage real
(S3/Cloudinary) antes de depender de esto en producción real.

## Infraestructura y despliegue

- **Railway** hostea el backend (servicio `invsshowsbackend`), build con
  Dockerfile (single-stage, no hay stage `development`), puerto expuesto
  8080, bind `0.0.0.0`. `npx prisma migrate deploy` corre en el Dockerfile
  en cada deploy.
- El auto-deploy al pushear a `main` ha demostrado ser poco confiable —
  no asumir que un `git push` sin más ya actualizó producción; puede
  hacer falta forzar un redeploy manual desde el dashboard de Railway.
- **CORS**: la whitelist real sale de `CORS_ORIGINS` (config `cors.origins`
  en `main.ts`) — agregar cualquier frontend nuevo u origen con puerto
  distinto ahí, no asumir que basta con levantarlo.
- Variables de entorno completas en `.env.example`; ver
  `INVS-Ayuda-Memoria.md` para URLs de los dashboards de Railway/Supabase
  y `INVS-Despliegue-Produccion.md` para la guía de despliegue completa.
