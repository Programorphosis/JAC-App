#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# backup-db.sh — Backup automático de PostgreSQL → local + S3
#
# FLUJO:
#   1. pg_dump dentro del contenedor postgres → comprime con gzip
#   2. Guarda en BACKUP_DIR (local, en el servidor)
#   3. Sube a S3 (AWS_BACKUP_BUCKET/AWS_BACKUP_PREFIX/)
#   4. Elimina copias locales más viejas que RETENTION_DAYS
#   5. (Opcional) Elimina copias en S3 más viejas que S3_RETENTION_DAYS
#
# USO MANUAL:
#   ./scripts/backup-db.sh
#
# INSTALAR CRON AUTOMÁTICO (ejecutar UNA vez en el servidor):
#   ./scripts/backup-db.sh --install-cron
#   → Programa backup diario a las 2:00 AM.
#
# REQUISITO EN EL SERVIDOR:
#   AWS CLI v2 instalado: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html
#   Las variables AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION,
#   AWS_BACKUP_BUCKET deben estar en .env.production
# ──────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuración ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Cargar variables de producción si existe el archivo
if [ -f "$PROJECT_DIR/.env.production" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env.production"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
DB_NAME="${DB_NAME:-jac_db}"
DB_USER="${DB_USER:-jac_user}"
DB_PASSWORD="${DB_PASSWORD:-}"
CONTAINER_NAME="${CONTAINER_NAME:-jac-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# S3
AWS_BACKUP_BUCKET="${AWS_BACKUP_BUCKET:-}"
AWS_BACKUP_PREFIX="${AWS_BACKUP_PREFIX:-db-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"
S3_RETENTION_DAYS="${S3_RETENTION_DAYS:-90}"  # Retención más larga en S3 (es barato)

# Zona horaria para el nombre del archivo (ej. America/Bogota para Colombia)
BACKUP_TIMEZONE="${BACKUP_TIMEZONE:-America/Bogota}"

# ── Modo --install-cron ────────────────────────────────────────────────────
if [ "${1:-}" = "--install-cron" ]; then
  CRON_CMD="0 2 * * * $SCRIPT_DIR/backup-db.sh >> /var/log/jac-backup.log 2>&1"
  if crontab -l 2>/dev/null | grep -qF "backup-db.sh"; then
    echo "[CRON] La entrada ya existe en crontab. No se modificó."
  else
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
    echo "[CRON] Backup diario instalado a las 2:00 AM"
    echo "[CRON] Logs en: /var/log/jac-backup.log"
  fi
  exit 0
fi

TIMESTAMP=$(TZ="${BACKUP_TIMEZONE}" date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="jac_${DB_NAME}_${TIMESTAMP}.sql.gz"
BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILENAME"

# ── Validaciones ───────────────────────────────────────────────────────────
if [ -z "$DB_PASSWORD" ]; then
  echo "[BACKUP ERROR] DB_PASSWORD no está configurada. Verifica .env.production" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[BACKUP ERROR] Contenedor '$CONTAINER_NAME' no está corriendo" >&2
  exit 1
fi

# ── Crear directorio de backups ────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

# ── 1. pg_dump dentro del contenedor ──────────────────────────────────────
echo "[BACKUP] Iniciando: $BACKUP_FILENAME"
echo "[BACKUP] DB: $DB_NAME | Contenedor: $CONTAINER_NAME"

# -e PGPASSWORD inyecta la variable DENTRO del contenedor donde corre pg_dump
docker exec \
  -e PGPASSWORD="$DB_PASSWORD" \
  "$CONTAINER_NAME" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --no-password \
  | gzip > "$BACKUP_FILE"

LOCAL_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[BACKUP OK] Local: $BACKUP_FILE ($LOCAL_SIZE)"

# ── 2. Subir a S3 ─────────────────────────────────────────────────────────
if [ -z "$AWS_BACKUP_BUCKET" ]; then
  echo "[BACKUP WARN] AWS_BACKUP_BUCKET no configurado. Saltando subida a S3."
  echo "[BACKUP WARN] Configura esta variable para tener backups fuera del servidor."
else
  S3_KEY="${AWS_BACKUP_PREFIX}/${BACKUP_FILENAME}"
  S3_URI="s3://${AWS_BACKUP_BUCKET}/${S3_KEY}"

  echo "[BACKUP] Subiendo a S3: $S3_URI"

  AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
  AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
  AWS_DEFAULT_REGION="$AWS_REGION" \
  aws s3 cp "$BACKUP_FILE" "$S3_URI" \
    --storage-class STANDARD_IA \
    --quiet

  echo "[BACKUP OK] S3: $S3_URI"

  # ── 3. Limpiar copias antiguas en S3 ────────────────────────────────────
  # Lista objetos del prefijo y elimina los más viejos que S3_RETENTION_DAYS.
  # Nota: aws s3 no tiene --delete-older-than nativo; usamos aws s3api.
  CUTOFF_DATE=$(date -d "-${S3_RETENTION_DAYS} days" +%Y-%m-%dT%H:%M:%S 2>/dev/null \
                || date -v-"${S3_RETENTION_DAYS}"d +%Y-%m-%dT%H:%M:%S)  # macOS fallback

  echo "[BACKUP] Limpiando objetos S3 anteriores a $S3_RETENTION_DAYS días..."
  S3_DELETED=0

  while IFS= read -r KEY; do
    if [ -n "$KEY" ]; then
      AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
      AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
      AWS_DEFAULT_REGION="$AWS_REGION" \
      aws s3 rm "s3://${AWS_BACKUP_BUCKET}/${KEY}" --quiet
      S3_DELETED=$((S3_DELETED + 1))
    fi
  done < <(
    AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
    AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
    AWS_DEFAULT_REGION="$AWS_REGION" \
    aws s3api list-objects-v2 \
      --bucket "$AWS_BACKUP_BUCKET" \
      --prefix "${AWS_BACKUP_PREFIX}/" \
      --query "Contents[?LastModified<='${CUTOFF_DATE}'].Key" \
      --output text 2>/dev/null || true
  )

  echo "[BACKUP] $S3_DELETED objeto(s) eliminado(s) de S3"
fi

# ── 4. Rotación local ─────────────────────────────────────────────────────
echo "[BACKUP] Limpiando copias locales > $RETENTION_DAYS días..."
LOCAL_DELETED=$(find "$BACKUP_DIR" -name "jac_${DB_NAME}_*.sql.gz" \
  -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
echo "[BACKUP] $LOCAL_DELETED archivo(s) local(es) eliminado(s)"

echo "[BACKUP] Proceso completado: $(date)"
