#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────
# Build y push de imágenes Docker para producción
#
# Requisitos:
#   - Docker instalado
#   - Cuenta en Docker Hub (o GitHub Container Registry)
#   - Login: docker login
#
# Uso:
#   DOCKER_IMAGE_PREFIX=tuusuario ./scripts/build-and-push.sh
#   # o exportar antes: export DOCKER_IMAGE_PREFIX=tuusuario
#
# En .env.production debe estar: DOCKER_IMAGE_PREFIX=tuusuario
# ──────────────────────────────────────────────────────────────────────────

set -e

PREFIX="${DOCKER_IMAGE_PREFIX:?Falta DOCKER_IMAGE_PREFIX (ej. tuusuario para Docker Hub)}"

echo "=== Build backend ==="
docker build -t "${PREFIX}/jacapp-backend:latest" ./apps/backend

echo "=== Build frontend ==="
docker build -t "${PREFIX}/jacapp-frontend:latest" ./apps/frontend

echo "=== Push backend ==="
docker push "${PREFIX}/jacapp-backend:latest"

echo "=== Push frontend ==="
docker push "${PREFIX}/jacapp-frontend:latest"

echo ""
echo "=== Listo. En el servidor ejecuta: ==="
echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production pull"
echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d"
echo ""
