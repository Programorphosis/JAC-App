# JAC App – Docker en desarrollo local

Mismo flujo que producción: BD en contenedor con volumen, sin depender de PostgreSQL en tu máquina.

---

## 1. Requisitos

- Docker y Docker Compose instalados
- Puerto 80 libre (o cambiar en el compose)

---

## 2. Configuración

### Crear archivo de entorno

```bash
cp .env.local.example .env.local
```

### Editar `.env.local`

Ajusta al menos:

- `DB_PASSWORD` – contraseña de PostgreSQL
- `JWT_SECRET` y `JWT_REFRESH_SECRET` – generar con `openssl rand -base64 64`
- `ENCRYPTION_MASTER_KEY` – generar con `openssl rand -hex 32`
- `BOOTSTRAP_TOKEN` – para la primera inicialización

**Importante:** Valores con espacios deben ir entre comillas: `EMAIL_FROM="JAC App <noreply@localhost>"`.

**Email:** Ya viene configurado para MailHog (`SMTP_HOST=mailhog`). Los correos se verán en http://localhost:8025.

---

## 3. Levantar los servicios

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.local up -d --build
```

O:

```bash
npm run docker:dev:up
```

Esto levanta:

- **PostgreSQL** (en contenedor, volumen persistente, sin puerto expuesto)
- **Backend** NestJS (ejecuta migraciones y seed automáticamente si la BD está vacía)
- **Frontend** Angular + nginx
- **Caddy** (reverse proxy en puertos 80 y 443)
- **MailHog** (SMTP en 1025, web en 8025)

---

## 4. Credenciales de demo

Tras el primer `up`, el seed crea usuarios automáticamente:

| Usuario        | Tipo | Documento | Contraseña |
|----------------|------|-----------|------------|
| Admin Junta    | CC   | 12345678  | 12345678   |
| Admin Plataforma | CC | 00000000  | 00000000   |

---

## 5. URLs

| Servicio   | URL                    |
|-----------|-------------------------|
| App       | http://localhost        |
| MailHog   | http://localhost:8025   |
| Bootstrap | `POST http://localhost/api/bootstrap` (con header `X-Bootstrap-Token`) |

---

## 6. Detener

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

O:

```bash
npm run docker:dev:down
```

---

## 7. Solución de problemas

**Error "key cannot contain a space":**
- **Causa:** Valores con espacios en `.env.local` sin comillas. Docker Compose v2+ es estricto.
- **Solución:** Poner entre comillas: `EMAIL_FROM="JAC App <noreply@localhost>"`, `DB_PASSWORD="tu contraseña"`.

**Acceder a la BD (Prisma Studio, etc.):**
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec backend npx prisma studio
```
(Prisma Studio corre dentro del contenedor; para ver la UI necesitas port-forward o añadir `ports: ["5555:5555"]` al backend si lo usas con frecuencia.)

---

## 8. Notas

- **Caddy con localhost:** Con `DOMAIN=localhost`, Caddy sirve HTTP sin SSL.
- **Logs:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f backend`
