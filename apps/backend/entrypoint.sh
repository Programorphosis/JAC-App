#!/bin/sh
set -e

echo "[Entrypoint] Verificando conexión a PostgreSQL..."

TIMEOUT=60
ELAPSED=0

until node -e "
  const net = require('net');
  const url = new URL(process.env.DATABASE_URL.split('?')[0]);
  const client = net.createConnection(parseInt(url.port || 5432), url.hostname);
  client.on('connect', () => { client.end(); process.exit(0); });
  client.on('error', () => process.exit(1));
" 2>/dev/null; do
  ELAPSED=$((ELAPSED + 2))
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "[Entrypoint] ERROR: PostgreSQL no disponible después de ${TIMEOUT}s. Abortando."
    exit 1
  fi
  echo "[Entrypoint] PostgreSQL no disponible todavía (${ELAPSED}s/${TIMEOUT}s), reintentando..."
  sleep 2
done

echo "[Entrypoint] PostgreSQL listo. Ejecutando migraciones..."
npx prisma migrate deploy

# Seed solo en desarrollo (RUN_SEED_IF_EMPTY=true). El seed es idempotente (solo corre si BD vacía).
if [ "$RUN_SEED_IF_EMPTY" = "true" ] && [ -f dist/prisma/seed-dev.js ]; then
  echo "[Entrypoint] Ejecutando seed (si BD vacía)..."
  node dist/prisma/seed-dev.js || true
fi

echo "[Entrypoint] Iniciando aplicación..."
exec node dist/src/main
