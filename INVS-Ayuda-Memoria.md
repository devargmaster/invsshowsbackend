# 🧠 INVS - Ayuda Memoria de Producción

> [!IMPORTANT]
> Este documento contiene información sobre la infraestructura en la nube. **No comitees contraseñas reales ni la URL completa de tu base de datos con contraseña.**

---

## 🌍 URLs Principales

| Servicio | URL |
| :--- | :--- |
| **Backend API (Producción)** | `https://invsshowsbackend-production.up.railway.app/api/v1` |
| **Railway Dashboard** | [Ver proyecto en Railway](https://railway.com/project/8b122fcc-1268-4b67-a3b9-cced07e118fe) |
| **Supabase Dashboard** | [Ver proyecto en Supabase](https://supabase.com/dashboard/project/dkhkrhrnjyxmvgwhhnwn) |

---

## ☁️ Infraestructura

### 1. Backend (Railway)
- **Servicio:** `invsshowsbackend`
- **Puerto expuesto:** `8080` (Configurado en el `Dockerfile` y en la opción "Generate Domain" de Railway).
- **Binding de NestJS:** `0.0.0.0` (Para permitir que el router de Railway le envíe tráfico).
- **Despliegue:** Automático al hacer push a la rama `main` en GitHub.
- **Variables de Entorno:** Se configuran en la pestaña **Variables** de Railway. El `NODE_ENV` está seteado en `production`.

> [!TIP]
> **Consola en la nube:** Si necesitás correr comandos en el servidor (ej: `npm run prisma:seed`), usá la pestaña **Console** en Railway.

### 2. Base de Datos (Supabase)
- **Motor:** PostgreSQL
- **Conexión Prisma:** Usa el **Session Pooler** de Supabase (puerto `6543`), no la URI directa.
- **Formato URL:** `postgresql://postgres.[ID]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
- **Migraciones:** Se ejecutan automáticamente en cada despliegue de Railway gracias al comando `npx prisma migrate deploy` en el Dockerfile.

---

## 📱 Frontend (App Móvil)

- **Archivo de conexión:** `invs-mobile-mvp-fixed/src/config/env.ts`
- **Configuración actual:** Todo el tráfico (celulares físicos, simuladores y web) apunta a la URL de producción de Railway.
- **Ventaja:** Podés probar la app en tu celular con datos móviles o en cualquier red WiFi, ya no dependés de que la Mac esté prendida o en la misma red.

---

## 🔑 Usuarios de Prueba (Seed)

Estos son los usuarios inyectados en la base de datos al correr `npm run prisma:seed` en Railway:

| Rol | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@invs.app` | `Admin123!` |
| **Staff** | `staff@invs.app` | `Staff123!` |
| **User (Premium)**| `demo@invs.app` | `Demo123!` |

---

## 🛠️ Comandos Frecuentes

**Sembrar la base de datos de producción con datos iniciales:**
> Se ejecuta en la pestaña "Console" de Railway.
```bash
npm run prisma:seed
```

**Ver logs de producción en tiempo real:**
> Se ven en la pestaña "Deploy Logs" de Railway.

**Arrancar la app móvil localmente:**
> En la terminal de tu Mac, en la carpeta `invs-mobile-mvp-fixed`.
```bash
npx expo start
```
