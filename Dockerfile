# ── Stage 1: Development ────────────────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate

EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ── Stage 2: Build ──────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 3: Production ─────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./

RUN npx prisma generate

EXPOSE 3000
CMD ["node", "dist/main"]
