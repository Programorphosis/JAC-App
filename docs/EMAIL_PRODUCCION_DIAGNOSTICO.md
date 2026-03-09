# Diagnóstico: correos de verificación no llegan en producción

Guía para diagnosticar por qué los correos de verificación (y otros emails transaccionales) no llegan en producción.

---

## 1. Verificar que el backend está configurado para email

En el servidor:

```bash
curl -s https://jacapp.online/api/health/ready | jq
```

Si `smtp` es `"connected"` → el backend puede conectar a SES.  
Si es `"not_configured"` → revisa EMAIL_TRANSPORT, SMTP_* en `.env.production`.

---

## 2. Causa más común: AWS SES en sandbox

**En sandbox, SES solo envía a direcciones verificadas.**

### Comprobar

1. AWS Console → **SES** → **Account dashboard**
2. Si ves "Sandbox" → estás en modo restringido.

### Soluciones

**A) Verificar cada email destino** (rápido para pruebas)

1. SES → **Verified identities** → **Create identity**
2. Tipo: **Email address**
3. Email: el que usas para probar (ej. `tu@email.com`)
4. Revisar el correo y hacer clic en el enlace de verificación

**B) Solicitar salida del sandbox** (recomendado para producción)

1. SES → **Account dashboard** → **Request production access**
2. Completar el formulario (uso, volumen estimado, etc.)
3. AWS suele aprobar en 24–48 h

---

## 3. Dominio remitente verificado

El `EMAIL_FROM` debe ser un dominio o email verificado en SES.

1. SES → **Verified identities**
2. Comprobar que `jacapp.online` (dominio) o `notificaciones@jacapp.online` (email) esté verificado
3. Si no: crear identidad y añadir los registros DNS que SES indique

---

## 4. Revisar logs del backend

Si hay errores al enviar, aparecen en los logs:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.prod.images.yml -f docker-compose.monitoring.yml --env-file .env.production logs backend --tail 100 | grep -i email
```

O buscar "Error enviando email" en los logs completos.

---

## 5. Checklist de variables en `.env.production`

| Variable | Valor esperado |
|----------|----------------|
| EMAIL_TRANSPORT | `ses` (sin espacios) |
| SMTP_HOST | `email-smtp.us-east-1.amazonaws.com` |
| SMTP_PORT | `587` |
| SMTP_USER | Credencial SMTP de SES (AKIA...) |
| SMTP_PASS | Contraseña SMTP de SES |
| EMAIL_FROM | `"Jacapp <notificaciones@jacapp.online>"` (entre comillas) |
| APP_PUBLIC_URL | `https://jacapp.online` |

---

## 6. Carpeta de spam

Los correos pueden llegar a spam. Revisar carpeta de correo no deseado.

---

## Referencias

- `docs/archive/EMAIL_SES_SETUP.md` — Configuración completa de SES
- `apps/backend/src/infrastructure/email/email.service.ts` — Envío de emails
