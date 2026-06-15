FROM node:20-alpine

WORKDIR /app

# Copiar manifests
COPY package*.json ./

# Copiar schema de Prisma antes de instalar (necesario para prisma generate)
COPY prisma ./prisma/

# Instalar todas las dependencias (incluyendo devDeps para nest build)
RUN npm ci

# Copiar el resto del código fuente
COPY . .

# Compilar TypeScript → dist/
RUN npm run build

# Variables de entorno de producción
ENV NODE_ENV=production

EXPOSE 3000

# Arrancar desde el dist compilado
CMD ["node", "dist/main"]
