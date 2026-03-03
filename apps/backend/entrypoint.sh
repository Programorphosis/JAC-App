#!/bin/sh
set -e

echo "[Entrypoint] Verificando conexión a PostgreSQL..."

# Espera activa sin herramientas externas — usa Node.js directamente
until node -e "
  const net = require('net');
  const url = new URL(process.env.DATABASE_URL.split('?')[0]);
  const client = net.createConnection(parseInt(url.port || 5432), url.hostname);
  client.on('connect', () => { client.end(); process.exit(0); });
  client.on('error', () => process.exit(1));
" 2>/dev/null; do
  echo "[Entrypoint] PostgreSQL no disponible todavía, reintentando en 2s..."
  sleep 2
done

echo "[Entrypoint] PostgreSQL listo. Ejecutando migraciones..."
npx prisma migrate deploy

echo "[Entrypoint] Iniciando aplicación..."
exec node dist/src/main
