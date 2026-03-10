# Backup y restauración de base de datos

Guía para realizar backups y restaurar la base de datos PostgreSQL del proyecto JAC App.

## Requisitos previos

- **Docker** con el contenedor PostgreSQL en ejecución (`jac-postgres` por defecto)
- **Archivo `.env.production`** en la raíz del proyecto con:
  - `DB_NAME`, `DB_USER`, `DB_PASSWORD`
  - `CONTAINER_NAME` (opcional, por defecto `jac-postgres`)
  - Para S3: `AWS_BACKUP_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`

> En Windows, ejecutar los scripts con **Git Bash** o **WSL**. PowerShell no ejecuta scripts bash directamente.

---

## Backup

### Ejecución manual

```bash
./scripts/backup-db.sh
```

1. Ejecuta `pg_dump` dentro del contenedor PostgreSQL
2. Comprime el dump con gzip
3. Guarda en `BACKUP_DIR` (por defecto `backups/` en la raíz)
4. Sube a S3 si `AWS_BACKUP_BUCKET` está configurado
5. Elimina copias locales más antiguas que `RETENTION_DAYS` (30 por defecto)

### Instalar cron automático (servidor Linux)

```bash
./scripts/backup-db.sh --install-cron
```

Programa un backup diario a las 2:00 AM. Los logs se escriben en `/var/log/jac-backup.log`.

---

## Restauración

> ⚠️ **ADVERTENCIA**: La restauración **BORRA todos los datos actuales** de la base de datos. Usar solo en emergencias o en entornos de staging. En producción, validar con el equipo antes de ejecutar.

### 1. Restaurar desde archivo local

```bash
./scripts/restore-db.sh backups/jac_jac_db_20260219_020000.sql.gz
```

El script:

1. Valida que el archivo exista y que el contenedor PostgreSQL esté corriendo
2. Solicita confirmación explícita (escribir `SI` en mayúsculas)
3. Descomprime y restaura con `psql`

### 2. Listar backups disponibles en S3

```bash
./scripts/restore-db.sh --list-s3
```

Requiere `AWS_BACKUP_BUCKET` en `.env.production`.

### 3. Restaurar desde S3

```bash
./scripts/restore-db.sh --from-s3 jac_jac_db_20260219_020000.sql.gz
```

1. Descarga el archivo desde S3 a `BACKUP_DIR`
2. Ejecuta el flujo normal de restauración desde archivo local

---

## Prueba de restauración (checklist)

Para validar que el proceso funciona correctamente:

1. **Crear un backup de prueba**
   ```bash
   ./scripts/backup-db.sh
   ```
   Verificar que se creó un archivo en `backups/` (o `BACKUP_DIR`).

2. **Anotar el nombre del archivo** generado (ej. `jac_jac_db_20260225_143000.sql.gz`).

3. **Ejecutar restauración**
   ```bash
   ./scripts/restore-db.sh backups/jac_jac_db_20260225_143000.sql.gz
   ```

4. **Confirmar** escribiendo `SI` cuando se solicite.

5. **Verificar** que la aplicación funciona:
   - Reiniciar el backend si está en Docker: `docker compose restart backend`
   - Probar login y navegación básica

6. **Documentar** en este archivo la fecha de la última prueba exitosa:
   - Fecha: _______________
   - Entorno: local / staging / producción
   - Observaciones: _______________

---

## Variables de entorno (backup/restore)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DB_NAME` | Nombre de la base de datos | `jac_db` |
| `DB_USER` | Usuario PostgreSQL | `jac_user` |
| `DB_PASSWORD` | Contraseña (obligatoria) | — |
| `CONTAINER_NAME` | Nombre del contenedor Docker | `jac-postgres` |
| `BACKUP_DIR` | Directorio local de backups | `./backups` |
| `BACKUP_TIMEZONE` | Zona horaria para el nombre del archivo | `America/Bogota` |
| `AWS_BACKUP_BUCKET` | Bucket S3 para backups | `asojac-backups-prod` |
| `AWS_BACKUP_PREFIX` | Prefijo/carpeta en S3 | `db-backups` |

---

## Errores frecuentes

| Error | Causa | Solución |
|-------|-------|----------|
| `DB_PASSWORD no está configurada` | Falta en `.env.production` | Añadir `DB_PASSWORD` |
| `Contenedor 'jac-postgres' no está corriendo` | Docker no levantado | `docker compose up -d postgres` |
| `Archivo no encontrado` | Ruta incorrecta al backup | Verificar ruta con `ls backups/` |
| `aws: command not found` | AWS CLI no instalado | Instalar [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) |
