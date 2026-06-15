# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Copiar manifests y schema de Prisma antes de instalar
# (prisma generate se ejecuta como postinstall y necesita el schema)
COPY package*.json ./
COPY prisma ./prisma/

# Instalar TODAS las deps (devDeps necesarias para nest build)
RUN npm ci

# Copiar el resto del código y compilar
COPY . .
RUN npm run build

# ── Stage 2: Production ─────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copiar manifests y schema de Prisma
COPY package*.json ./
COPY prisma ./prisma/

# Instalar solo deps de producción (prisma generate corre aquí con el schema presente)
RUN npm ci --only=production

# Copiar el dist compilado desde el stage de build
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"]
