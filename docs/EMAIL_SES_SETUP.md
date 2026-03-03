# Configuración de AWS SES para JAC App

El proyecto usa **Nodemailer** con transporte SMTP. En producción se usa **AWS SES**; en desarrollo local, **MailHog**.

---

## 1. Crear identidad verificada en SES

### Opción A: Verificar el dominio (recomendado para jacapp.online)

1. AWS Console → **SES** → **Verified identities** → **Create identity**
2. Tipo: **Domain**
3. Dominio: `jacapp.online`
4. Marcar **Use a custom MAIL FROM domain** (opcional; mejora entregabilidad)
5. **Create identity**
6. Añadir los registros DNS que SES muestre (CNAME para DKIM, etc.) en tu proveedor de DNS
7. Esperar verificación (puede tardar hasta 72 h, normalmente minutos)

Tras verificar, podrás enviar desde cualquier dirección `*@jacapp.online` (ej. `noreply@jacapp.online`).

### Opción B: Verificar solo un email (más rápido para pruebas)

1. SES → **Verified identities** → **Create identity**
2. Tipo: **Email address**
3. Email: `noreply@jacapp.online` (o el que uses)
4. **Create identity**
5. Revisar el correo y hacer clic en el enlace de verificación

---

## 2. Crear credenciales SMTP

1. SES → **SMTP settings** (menú izquierdo)
2. **Create SMTP credentials**
3. Nombre sugerido: `jac-app-smtp`
4. **Create user**
5. Guardar **SMTP username** y **SMTP password** (la contraseña solo se muestra una vez)

Los valores irán en `SMTP_USER` y `SMTP_PASS` del `.env.production`.

---

## 3. Endpoints SMTP por región

| Región AWS | Host SMTP |
|-------------|-----------|
| us-east-1 | `email-smtp.us-east-1.amazonaws.com` |
| us-east-2 | `email-smtp.us-east-2.amazonaws.com` |
| us-west-2 | `email-smtp.us-west-2.amazonaws.com` |
| sa-east-1 (São Paulo) | `email-smtp.sa-east-1.amazonaws.com` |
| eu-west-1 | `email-smtp.eu-west-1.amazonaws.com` |

Puerto: **587** (STARTTLS).

---

## 4. Variables de entorno en producción

En `.env.production`:

```env
EMAIL_TRANSPORT=ses
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIA...
SMTP_PASS=...
EMAIL_FROM=JAC App <noreply@jacapp.online>
APP_PUBLIC_URL=https://jacapp.online
```

---

## 5. Sandbox de SES

Por defecto SES está en **sandbox**:

- Solo puedes enviar a direcciones verificadas
- Límites bajos de envío

Para producción:

1. SES → **Account dashboard** → **Request production access**
2. Completar el formulario (uso, volumen estimado, etc.)
3. AWS suele aprobar en 24–48 h

---

## 6. Desarrollo local con MailHog

```bash
# Levantar MailHog
docker compose -f docker-compose.mailhog.yml up -d

# Ver correos en http://localhost:8025
```

En `apps/backend/.env`:

```env
EMAIL_TRANSPORT=mailhog
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=JAC App <noreply@localhost>
APP_PUBLIC_URL=http://localhost:4200
```

No hace falta `SMTP_USER` ni `SMTP_PASS` para MailHog.

---

## 7. Deshabilitar email

Si no quieres enviar correos (por ejemplo en CI):

```env
EMAIL_TRANSPORT=disabled
```

Los envíos se omiten sin errores.

---

## 8. Checklist

- [ ] Identidad verificada en SES (dominio o email)
- [ ] Credenciales SMTP creadas y guardadas
- [ ] Variables en `.env.production` configuradas
- [ ] (Producción) Solicitud de salida del sandbox aprobada
- [ ] (Local) MailHog corriendo y variables de mailhog en `.env`
