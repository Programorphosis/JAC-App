# JAC App – Docker (resumen)

Separación clara entre desarrollo y producción.

---

## Estructura

| Archivo | Uso |
|---------|-----|
| `docker-compose.yml` | Base compartido (postgres, backend, frontend, caddy). **No usar solo.** |
| `docker-compose.dev.yml` | Override desarrollo: `.env.local`, MailHog, postgres expuesto |
| `docker-compose.prod.yml` | Override producción: `.env.production` |
| `docker-compose.prod.images.yml` | Override opcional: imágenes pre-construidas (registry) |

---

## Comandos

### Desarrollo

```bash
cp .env.local.example .env.local
# Editar .env.local
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.local up -d --build
# o: npm run docker:dev:up
```

BD en contenedor con volumen (igual que prod). Seed automático si la BD está vacía.

Ver: [DOCKER_LOCAL.md](./DOCKER_LOCAL.md)

### Producción (build en servidor)

```bash
cp .env.production.example .env.production
# Editar .env.production
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d --build
# o: npm run docker:prod:up
```

Ver: [DOCKER_PROD.md](./DOCKER_PROD.md)

### Producción (imágenes pre-construidas)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.prod.images.yml --env-file .env.production up -d
```

---

## Error "key cannot contain a space"

**Causa:** Valores con espacios en archivos `.env` sin comillas.

**Solución:** Usar comillas: `EMAIL_FROM="JAC App <noreply@localhost>"`

Validar: `.\scripts\validate-env.ps1 .env.local`
