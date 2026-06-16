FROM node:20-alpine

WORKDIR /app

# Instalar OpenSSL requerido por Prisma en Alpine
RUN apk add --no-cache openssl

# Copiar manifests y schema de Prisma
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas las deps (incluyendo devDeps para @nestjs/cli)
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript → dist/
RUN npm run build

# Verificar que dist/main.js existe (falla el build si no)
RUN ls -la dist/ && test -f dist/main.js

ENV NODE_ENV=production
EXPOSE 8080

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
