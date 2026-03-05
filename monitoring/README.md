# Monitoreo JAC App

Stack: Uptime Kuma, Prometheus, Grafana.

## Levantar con el stack principal

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  -f docker-compose.monitoring.yml --env-file .env.production up -d
```

## Subdominios (Caddy)

| Subdominio | Servicio | Autenticación |
|------------|----------|---------------|
| `https://monitor.{DOMAIN}` | Uptime Kuma | Basicauth (MONITOR_BASICAUTH) |
| `https://grafana.{DOMAIN}` | Grafana | Basicauth + login Grafana |

**Requisitos:**
1. DNS: registros A para `monitor` y `grafana` apuntando a la IP del servidor.
2. `.env.production`: `MONITOR_BASICAUTH="admin <hash>"` (generar con `caddy hash-password`).

## Acceso local (puertos)

- Uptime Kuma: http://localhost:3001
- Grafana: http://localhost:3002 (admin / admin por defecto)
- Prometheus: http://localhost:9090 (solo red interna, no expuesto)

## Próximos pasos

Cuando el backend exponga `/metrics` (con `@willsoto/nestjs-prometheus`), añadir en `prometheus.yml`:

```yaml
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3000']
```
