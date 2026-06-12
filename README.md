# INVS Backend

API REST para la plataforma de eventos INVS — NestJS + Prisma + PostgreSQL + Mux.

## Stack

- **Framework**: NestJS 10 (TypeScript)
- **ORM**: Prisma 5
- **Base de datos**: PostgreSQL 16
- **Auth**: JWT (access 15min) + Refresh Tokens (30d, cookie HttpOnly)
- **Streaming**: Mux Video
- **Validación QR**: HMAC-SHA256 con anti-reutilización

## Módulos

| Módulo | Descripción |
|--------|-------------|
| `auth` | Registro, login, refresh token, logout |
| `users` | Perfil propio, gestión admin |
| `subscriptions` | Planes, suscripciones, cancelación |
| `events` | CRUD de eventos presenciales/streaming/híbridos |
| `tickets` | Generación de QR firmado + validación por staff |
| `streaming` | Token de playback Mux, creación de live streams |
| `recordings` | Biblioteca de grabaciones VOD |

## Inicio rápido (desarrollo)

```bash
cp .env.example .env
# Editar .env con secretos

npm install
docker-compose up postgres -d
npm run prisma:migrate:dev
npm run prisma:seed
npm run start:dev
```

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/docs`

## Credenciales de prueba (seed)

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@invs.app | Admin123! |
| Staff | staff@invs.app | Staff123! |
| Usuario | demo@invs.app | Demo123! |

## Despliegue en producción

Ver [INVS-Despliegue-Produccion.md](./INVS-Despliegue-Produccion.md) para guía completa con Railway, Neon, Mux y checklist de seguridad.
