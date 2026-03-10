#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# restore-db.sh — Restaurar backup de PostgreSQL (local o desde S3)
#
# USO:
#   # Restaurar desde archivo local:
#   ./scripts/restore-db.sh backups/jac_jac_db_20260219_020000.sql.gz
#
#   # Listar backups disponibles en S3:
#   ./scripts/restore-db.sh --list-s3
#
#   # Descargar desde S3 y restaurar:
#   ./scripts/restore-db.sh --from-s3 jac_jac_db_20260219_020000.sql.gz
#
# ⚠️  ATENCIÓN: Este script BORRA todos los datos actuales antes de restaurar.
#    Usar solo en emergencia o en servidor de staging.
# ──────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Cargar variables de producción si existe
if [ -f "$PROJECT_DIR/.env.production" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env.production"
  set +a
fi

DB_NAME="${DB_NAME:-jac_db}"
DB_USER="${DB_USER:-jac_user}"
DB_PASSWORD="${DB_PASSWORD:-}"
CONTAINER_NAME="${CONTAINER_NAME:-jac-postgres}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
AWS_BACKUP_BUCKET="${AWS_BACKUP_BUCKET:-}"
AWS_BACKUP_PREFIX="${AWS_BACKUP_PREFIX:-db-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# ── Validaciones base ─────────────────────────────────────────────────────
if [ -z "$DB_PASSWORD" ]; then
  echo "[RESTORE ERROR] DB_PASSWORD no está configurada. Verifica .env.production" >&2
  exit 1
fi

# ── Modo --list-s3 ────────────────────────────────────────────────────────
if [ "${1:-}" = "--list-s3" ]; then
  if [ -z "$AWS_BACKUP_BUCKET" ]; then
    echo "[ERROR] AWS_BACKUP_BUCKET no está configurado en .env.production" >&2
    exit 1
  fi

  echo "Backups disponibles en S3 (s3://${AWS_BACKUP_BUCKET}/${AWS_BACKUP_PREFIX}/):"
  echo ""

  AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
  AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
  AWS_DEFAULT_REGION="$AWS_REGION" \
  aws s3 ls "s3://${AWS_BACKUP_BUCKET}/${AWS_BACKUP_PREFIX}/" \
    --human-readable \
    | sort -r \
    | head -20

  echo ""
  echo "Para restaurar desde S3:"
  echo "  ./scripts/restore-db.sh --from-s3 <nombre-del-archivo.sql.gz>"
  exit 0
fi

# ── Modo --from-s3 ────────────────────────────────────────────────────────
if [ "${1:-}" = "--from-s3" ]; then
  if [ -z "$AWS_BACKUP_BUCKET" ]; then
    echo "[ERROR] AWS_BACKUP_BUCKET no está configurado en .env.production" >&2
    exit 1
  fi

  S3_FILENAME="${2:-}"
  if [ -z "$S3_FILENAME" ]; then
    echo "USO: $0 --from-s3 <nombre-del-archivo.sql.gz>" >&2
    echo ""
    echo "Listando backups disponibles..."
    "$0" --list-s3
    exit 1
  fi

  S3_URI="s3://${AWS_BACKUP_BUCKET}/${AWS_BACKUP_PREFIX}/${S3_FILENAME}"
  LOCAL_TEMP="$BACKUP_DIR/$S3_FILENAME"
  mkdir -p "$BACKUP_DIR"

  echo "[RESTORE] Descargando desde S3: $S3_URI"
  AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
  AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
  AWS_DEFAULT_REGION="$AWS_REGION" \
  aws s3 cp "$S3_URI" "$LOCAL_TEMP"

  echo "[RESTORE] Descargado en: $LOCAL_TEMP"
  # Reutilizar el flujo normal de restauración desde archivo local
  exec "$0" "$LOCAL_TEMP"
fi

# ── Restauración desde archivo local ─────────────────────────────────────
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "USO: $0 <archivo_backup.sql.gz>" >&2
  echo "     $0 --list-s3                      (listar backups en S3)" >&2
  echo "     $0 --from-s3 <archivo.sql.gz>      (descargar de S3 y restaurar)" >&2
  echo ""
  echo "Backups locales disponibles:"
  ls -lt "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -10 \
    || echo "  (ninguno encontrado en $BACKUP_DIR)"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[RESTORE ERROR] Archivo no encontrado: $BACKUP_FILE" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[RESTORE ERROR] Contenedor '$CONTAINER_NAME' no está corriendo" >&2
  exit 1
fi

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)

# ── Confirmación explícita ─────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ⚠️  ADVERTENCIA — OPERACIÓN DESTRUCTIVA                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Base de datos : $DB_NAME"
echo "  Contenedor    : $CONTAINER_NAME"
echo "  Backup        : $(basename "$BACKUP_FILE") ($BACKUP_SIZE)"
echo ""
echo "  Todos los datos actuales serán ELIMINADOS y reemplazados."
echo ""
read -rp "  ¿Confirmar? Escribe 'SI' para continuar: " CONFIRM
if [ "$CONFIRM" != "SI" ]; then
  echo "[RESTORE] Operación cancelada."
  exit 0
fi

# ── Restaurar ─────────────────────────────────────────────────────────────
echo "[RESTORE] Restaurando desde: $(basename "$BACKUP_FILE")"

# La contraseña se inyecta dentro del contenedor con -e PGPASSWORD
gunzip -c "$BACKUP_FILE" | docker exec -i \
  -e PGPASSWORD="$DB_PASSWORD" \
  "$CONTAINER_NAME" \
  psql -U "$DB_USER" -d "$DB_NAME" --quiet

echo ""
echo "[RESTORE OK] Base de datos restaurada: $(date)"
echo "[RESTORE] Reinicia el backend para que los cambios surtan efecto:"
echo "  docker compose restart backend"
