# Configuración del dominio jacapp.online

**Dominio:** `jacapp.online`  
**Propósito:** Referencia única de todas las variables y lugares donde se usa el dominio en el proyecto JAC App.

---

## 1. Resumen rápido

| Variable / Lugar | Valor para jacapp.online | Cuándo se usa |
|------------------|--------------------------|---------------|
| `DOMAIN` | `jacapp.online` | Caddy (SSL), docker-compose |
| `API_PUBLIC_URL` | `https://jacapp.online` | Backend: URLs internas, QR, webhooks |
| `CORS_ORIGIN` | `https://jacapp.online` | Backend: permitir peticiones del frontend |
| `APP_PUBLIC_URL` | `https://jacapp.online` | Emails: enlaces en los correos |
| `EMAIL_FROM` | `JAC App <noreply@jacapp.online>` | Emails: remitente |
| `WOMPI_REDIRECT_URL` | `https://jacapp.online/pagos/retorno` | Wompi: redirección tras pago afiliado |
| `WOMPI_REDIRECT_URL_FACTURAS` | `https://jacapp.online/facturas-plataforma/retorno` | Wompi: redirección tras pago factura |
| `MAILGUN_DOMAIN` (si usas Mailgun) | `mg.jacapp.online` o subdominio verificado | Mailgun |
| Frontend `apiUrl` (prod) | `/api` | Ya usa ruta relativa; el dominio es el mismo |

---

## 2. Variables por archivo

### 2.1 `.env.production` (producción)

```env
# Dominio principal
DOMAIN=jacapp.online

# URL pública del backend (sin /api al final)
# Con Caddy: frontend y backend comparten el mismo dominio
API_PUBLIC_URL=https://jacapp.online

# CORS: permitir peticiones desde el frontend
CORS_ORIGIN=https://jacapp.online

# Wompi: URLs de retorno tras el pago
WOMPI_REDIRECT_URL=https://jacapp.online/pagos/retorno
WOMPI_REDIRECT_URL_FACTURAS=https://jacapp.online/facturas-plataforma/retorno
```

### 2.2 `apps/backend/.env` (producción)

Las variables anteriores se pasan al backend desde `.env.production` vía docker-compose. Además:

```env
# Email: remitente y enlaces en los correos
EMAIL_FROM=JAC App <noreply@jacapp.online>
APP_PUBLIC_URL=https://jacapp.online

# Si usas Mailgun: verificar el dominio jacapp.online en Mailgun
# y usar el subdominio que te asignen (ej. mg.jacapp.online)
MAILGUN_DOMAIN=mg.jacapp.online
```

### 2.3 Email con AWS SES

El proyecto usa Nodemailer con AWS SES. Ver **`docs/EMAIL_SES_SETUP.md`** para la configuración completa.

```env
EMAIL_TRANSPORT=ses
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=<credencial SES>
SMTP_PASS=<credencial SES>
EMAIL_FROM=JAC App <noreply@jacapp.online>
APP_PUBLIC_URL=https://jacapp.online
```

El remitente debe estar verificado en SES (dominio `jacapp.online` o email `noreply@jacapp.online`).

---

## 3. Dónde se usa cada variable

| Variable | Archivo / componente | Uso |
|----------|---------------------|-----|
| `DOMAIN` | `docker-compose.yml` → Caddy | Caddy obtiene el certificado SSL para `jacapp.online` |
| `DOMAIN` | `Caddyfile` | `{$DOMAIN}` → host virtual que Caddy escucha |
| `API_PUBLIC_URL` | `carta-pdf.service.ts` | URL base para el QR de validación: `{API_PUBLIC_URL}/api/public/validar-carta/{qrToken}` |
| `API_PUBLIC_URL` | `pagos.service.ts` (backend) | URLs internas cuando se construyen URLs |
| `CORS_ORIGIN` | `main.ts` | `origin: process.env.CORS_ORIGIN` → permite peticiones desde el frontend |
| `APP_PUBLIC_URL` | `email.service.ts` | Enlaces en emails: `{APP_PUBLIC_URL}/facturas-plataforma`, etc. |
| `EMAIL_FROM` | `email.service.ts` | Remitente de correos |
| `WOMPI_REDIRECT_URL` | Backend | Se envía a Wompi: dónde redirigir tras pago de afiliado |
| `WOMPI_REDIRECT_URL_FACTURAS` | Backend | Dónde redirigir tras pago de factura plataforma |

---

## 4. Configuración DNS (obligatorio antes de levantar)

El DNS debe apuntar al servidor **antes** de que Caddy levante por primera vez (Let's Encrypt valida el dominio).

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| **A** | `@` (o `jacapp.online`) | IP del servidor Lightsail | 300 |
| **AAAA** | `@` | (opcional) IPv6 del servidor | 300 |

Si usas subdominios (ej. `app.jacapp.online` o `api.jacapp.online`), añade registros para cada uno.

**Arquitectura actual:** Un solo dominio `jacapp.online` sirve todo (frontend + API en `/api`). No necesitas subdominios.

---

## 5. Wompi: webhook y URLs

En el dashboard de Wompi (producción):

1. **Webhook URL:** `https://jacapp.online/api/webhooks/wompi`
2. **URL de retorno:** Se configura por intención de pago; el backend usa `WOMPI_REDIRECT_URL` y `WOMPI_REDIRECT_URL_FACTURAS`.

---

## 6. Verificación de dominio para email

### Mailgun
- Añadir dominio `jacapp.online` en Mailgun.
- Configurar los registros DNS que te indiquen (CNAME, TXT, MX).
- Usar el subdominio que Mailgun asigne (ej. `mg.jacapp.online`) en `MAILGUN_DOMAIN`.

### Amazon SES
- En SES → Verified identities → Create identity.
- Elegir "Domain" (ej. `jacapp.online`).
- Añadir los registros DNS que te indiquen (CNAME para DKIM).
- Usar `noreply@jacapp.online` en `EMAIL_FROM`.

---

## 7. Checklist de despliegue

- [ ] DNS: registro A de `jacapp.online` → IP del servidor Lightsail
- [ ] `.env.production`: `DOMAIN`, `API_PUBLIC_URL`, `CORS_ORIGIN` con `jacapp.online`
- [ ] `.env.production`: `WOMPI_REDIRECT_URL` y `WOMPI_REDIRECT_URL_FACTURAS` con `https://jacapp.online/...`
- [ ] Backend: `EMAIL_FROM`, `APP_PUBLIC_URL` con `jacapp.online`
- [ ] Verificar dominio en Mailgun o SES según el proveedor de email
- [ ] Wompi: webhook `https://jacapp.online/api/webhooks/wompi`
- [ ] Levantar Caddy: `docker compose --env-file .env.production up -d`
- [ ] Comprobar: `https://jacapp.online/api/health/ready` responde 200

---

## 8. Desarrollo local (sin cambios)

En local no usas `jacapp.online`:

| Variable | Valor local |
|----------|-------------|
| `CORS_ORIGIN` | `http://localhost:4200` |
| `APP_PUBLIC_URL` | `http://localhost:4200` |
| `API_PUBLIC_URL` | `http://localhost:3000` (o vacío) |
| `WOMPI_REDIRECT_URL` | `http://localhost:4200/pagos/retorno` |

El frontend en dev usa `environment.apiUrl = 'http://localhost:3000/api'`.
