# ──────────────────────────────────────────────
# Etapa 1: build
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias primero (cache layer)
COPY package*.json ./
RUN npm ci

# Copiar código fuente y compilar
COPY . .
RUN npm run build

# ──────────────────────────────────────────────
# Etapa 2: producción (imagen mínima)
# ──────────────────────────────────────────────
FROM node:20-alpine AS runner

# Usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nestjs

WORKDIR /app

# Solo dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Código compilado y schema de Prisma
COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/prisma      ./prisma

# Generar cliente Prisma para el entorno de producción
RUN npx prisma generate

# Entrypoint: espera postgres, corre migraciones, inicia app
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nestjs

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
