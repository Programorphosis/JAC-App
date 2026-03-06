# ──────────────────────────────────────────────────────────────────────────
# Build y push de imágenes Docker para producción (Windows PowerShell)
#
# Requisitos:
#   - Docker Desktop instalado
#   - Cuenta en Docker Hub: https://hub.docker.com
#   - Login: docker login
#
# Uso:
#   $env:DOCKER_IMAGE_PREFIX = "tuusuario"
#   .\scripts\build-and-push.ps1
#
# O en una línea:
#   $env:DOCKER_IMAGE_PREFIX="tuusuario"; .\scripts\build-and-push.ps1
# ──────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

$prefix = $env:DOCKER_IMAGE_PREFIX
if (-not $prefix) {
    Write-Host "ERROR: Define DOCKER_IMAGE_PREFIX (tu usuario de Docker Hub)" -ForegroundColor Red
    Write-Host "  `$env:DOCKER_IMAGE_PREFIX = `"tuusuario`"" -ForegroundColor Yellow
    exit 1
}

Write-Host "=== Build backend ===" -ForegroundColor Cyan
docker build -t "${prefix}/jacapp-backend:latest" ./apps/backend

Write-Host "=== Build frontend ===" -ForegroundColor Cyan
docker build -t "${prefix}/jacapp-frontend:latest" ./apps/frontend

Write-Host "=== Push backend ===" -ForegroundColor Cyan
docker push "${prefix}/jacapp-backend:latest"

Write-Host "=== Push frontend ===" -ForegroundColor Cyan
docker push "${prefix}/jacapp-frontend:latest"

Write-Host ""
Write-Host "=== Listo. En el servidor ejecuta: ===" -ForegroundColor Green
Write-Host ""
Write-Host "  # App + monitoreo (Uptime Kuma, Prometheus, Grafana):" -ForegroundColor Yellow
Write-Host "  docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.prod.images.yml -f docker-compose.monitoring.yml --env-file .env.production pull"
Write-Host "  docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.prod.images.yml -f docker-compose.monitoring.yml --env-file .env.production up -d"
Write-Host ""
Write-Host "  # Solo app (sin monitoreo):" -ForegroundColor Yellow
Write-Host "  docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.prod.images.yml --env-file .env.production pull"
Write-Host "  docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.prod.images.yml --env-file .env.production up -d"
Write-Host ""
