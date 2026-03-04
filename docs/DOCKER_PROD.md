# JAC App – Docker en producción

Guía para desplegar la app con Docker en un servidor de producción.

---

## 1. Requisitos

- Docker y Docker Compose instalados en el servidor
- Dominio configurado (registro DNS A apuntando a la IP del servidor)
- Puertos 80 y 443 abiertos en el firewall

---

## 2. Configuración

### Crear archivo de entorno

```bash
cp .env.production.example .env.production
```

### Editar `.env.production`

Completa todos los valores marcados con `<CAMBIAR>` o `<GENERAR>`:

| Variable | Descripción |
|----------|-------------|
| `DB_PASSWORD` | Contraseña segura para PostgreSQL |
| `DOMAIN` | Tu dominio (ej. `jacapp.online`) |
| `API_PUBLIC_URL` | URL pública del backend (ej. `https://jacapp.online`) |
| `CORS_ORIGIN` | Origen permitido (ej. `https://jacapp.online`) |
| `JWT_SECRET` | Generar: `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | Generar: `openssl rand -base64 64` |
| `ENCRYPTION_MASTER_KEY` | Generar: `openssl rand -hex 32` |
| `BOOTSTRAP_TOKEN` | Generar: `openssl rand -base64 32` |
| `EMAIL_FROM` | **Entre comillas** si tiene espacios: `"JAC App <noreply@tudominio.com>"` |
| Credenciales Wompi, AWS SES, S3, etc. | Según tu configuración |

**Importante:** Valores con espacios deben ir entre comillas para evitar el error "key cannot contain a space".

---

## 3. Levantar (build en servidor)

Construye las imágenes en el propio servidor:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d --build
```

O:

```bash
npm run docker:prod:up
```

---

## 4. Levantar (imágenes pre-construidas)

Si usas un registry (Docker Hub, ECR, etc.):

1. En `.env.production`, define `DOCKER_IMAGE_PREFIX` (ej. `tuusuario` para Docker Hub).
2. Pull y up con el override de imágenes:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.prod.images.yml --env-file .env.production pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.prod.images.yml --env-file .env.production up -d
```

---

## 5. Bootstrap (primera vez)

Si la BD está vacía, ejecuta el bootstrap:

```bash
curl -X POST https://tu-dominio.com/api/bootstrap \
  -H "X-Bootstrap-Token: TU_BOOTSTRAP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Mi Junta","nit":"900123456","email":"admin@tudominio.com","telefono":"+573001234567"}'
```

---

## 6. Detener

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production down
```

---

## 7. Logs

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
```

---

## 8. Arquitectura

```
Internet (HTTPS)
    ↓
Caddy :80/:443 (Let's Encrypt)
    ↓
Frontend (nginx + Angular)
    ↓
Backend (NestJS)
    ↓
PostgreSQL (red interna)
```
