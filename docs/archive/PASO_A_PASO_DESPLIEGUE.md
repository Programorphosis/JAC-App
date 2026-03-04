# Paso a paso: desplegar cambios

Guía rápida para desplegar los cambios que hagas en el proyecto. Usa imágenes pre-construidas (sin build en el servidor).

---

## Cada vez que hagas cambios

### 1. En tu PC (PowerShell)

```powershell
cd "c:\Users\gdmp9\Desktop\JAC App"
$env:DOCKER_IMAGE_PREFIX = "tu-usuario-dockerhub"
.\scripts\build-and-push.ps1
```

*(Sustituye `tu-usuario-dockerhub` por tu usuario real, ej. `programorphosis92`)*

**Qué hace:** construye backend y frontend, los sube a Docker Hub.

---

### 2. En el servidor (SSH)

Conéctate primero:

```powershell
ssh -i "C:\ruta\a\tu-clave.pem" ubuntu@TU_IP
```

Luego ejecuta:

```bash
cd ~/JAC-App
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d
```

**Qué hace cada comando:**
- `git pull` → trae cambios de docker-compose, Caddyfile, etc.
- `pull` → descarga las nuevas imágenes de Docker Hub
- `up -d` → reinicia los contenedores con las nuevas imágenes

---

## Checklist rápido

| Paso | Dónde | Comando |
|------|-------|---------|
| 1 | PC | `cd "c:\Users\gdmp9\Desktop\JAC App"` |
| 2 | PC | `$env:DOCKER_IMAGE_PREFIX="tuusuario"; .\scripts\build-and-push.ps1` |
| 3 | Servidor | `cd ~/JAC-App` |
| 4 | Servidor | `git pull` |
| 5 | Servidor | `docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production pull` |
| 6 | Servidor | `docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d` |

---

## Notas importantes

- **No hace falta detener nada** antes del `pull` en el servidor.
- **`.env.production`** está en `.gitignore`; `git pull` no lo modifica.
- **El seed** solo se ejecuta la primera vez que despliegas. No lo vuelvas a correr en actualizaciones.
- Si cambias **solo** código (backend/frontend) y no docker-compose ni Caddyfile, el `git pull` no es estrictamente necesario, pero conviene hacerlo por si acaso.

---

## Comandos útiles en el servidor

```bash
# Ver logs del backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend

# Reiniciar el seed (solo si necesitas datos de prueba de nuevo)
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend npx prisma migrate reset --force

# Ver estado de los contenedores
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

---

## Si algo falla

- **"pull access denied"** → `docker login` en el servidor; revisa `DOCKER_IMAGE_PREFIX` en `.env.production`.
- **Contenedor en Exit** → `docker compose ... logs backend` para ver el error.
- **La app no carga** → revisa DNS, firewall (puertos 80/443) y que Caddy esté corriendo.
