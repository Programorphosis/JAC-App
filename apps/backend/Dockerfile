# ──────────────────────────────────────────────
# Etapa 1: build
# ──────────────────────────────────────────────
FROM node:20.18-alpine AS builder

WORKDIR /app

# Instalar dependencias primero (cache layer)
# --ignore-scripts: postinstall hace prisma generate pero prisma/ aún no está copiado
COPY package*.json ./
RUN npm install --ignore-scripts

# Copiar código fuente y compilar (npm run build incluye prisma generate)
# DATABASE_URL: prisma generate no conecta a la BD, solo necesita el formato de la URL
COPY . .
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
RUN npm run build

# ──────────────────────────────────────────────
# Etapa 2: producción (imagen mínima)
# ──────────────────────────────────────────────
FROM node:20.18-alpine AS runner

# Usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nestjs

WORKDIR /app

# Solo dependencias de producción
# --ignore-scripts: postinstall ejecuta prisma generate pero prisma/ aún no está copiado
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Código compilado, schema de Prisma y script de seed
COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/prisma      ./prisma
COPY --from=builder /app/scripts     ./scripts

# Generar cliente Prisma (DATABASE_URL se inyecta en runtime vía env_file)
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
RUN npx prisma generate

# Entrypoint: espera postgres, corre migraciones, inicia app
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Permisos: nestjs debe poder escribir en node_modules (prisma migrate reset, etc.)
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
