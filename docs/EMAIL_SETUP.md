# Configuración de emails – JAC App

El backend usa **Nodemailer** con transporte SMTP. En producción: AWS SES. En local: MailHog o deshabilitado.

---

## 1. Desarrollo local

### Opción A: MailHog (recomendada)

```bash
docker compose -f docker-compose.mailhog.yml up -d
```

En `apps/backend/.env`:
```
EMAIL_TRANSPORT=mailhog
SMTP_HOST=localhost
SMTP_PORT=1025
```

Ver correos: http://localhost:8025

### Opción B: Deshabilitar

```
EMAIL_TRANSPORT=disabled
```

---

## 2. Producción: AWS SES

### 2.1 Verificar identidad

- **Dominio:** SES → Verified identities → Create identity → Domain → `jacapp.online`
- Añadir registros DNS (CNAME, DKIM) que SES muestre
- Tras verificar: enviar desde `*@jacapp.online`

### 2.2 Credenciales SMTP

- SES → SMTP settings → Create SMTP credentials
- Guardar username y password (solo se muestra una vez)

### 2.3 Variables en .env.production

```env
EMAIL_TRANSPORT=ses
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIA...
SMTP_PASS=...
EMAIL_FROM=JAC App <noreply@jacapp.online>
APP_PUBLIC_URL=https://jacapp.online
```

### 2.4 Salir del sandbox SES

Por defecto SES solo envía a direcciones verificadas. Para producción: solicitar salida del sandbox en AWS Console.

---

## 3. Emails que envía la app

- Recuperación de contraseña (código)
- Facturas pendientes
- Suscripción por vencer / vencida
- Confirmación de pago
