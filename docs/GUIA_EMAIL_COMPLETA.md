# Guía completa: Sistema de emails en JAC App

Esta guía explica **cómo funciona** el envío de correos, **qué configurar** en cada entorno y **de dónde sacar** cada variable.

---

## 1. ¿Cómo funciona el sistema de emails?

El backend usa **Nodemailer**, una librería que envía correos a través de un **servidor SMTP**. Según el entorno, ese servidor cambia:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Tu aplicación  │ ──► │  Servidor SMTP   │ ──► │  Destinatario   │
│  (NestJS)      │     │  (según entorno)  │     │  (usuario real) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

| Entorno | Servidor SMTP | ¿Llega el correo de verdad? |
|---------|---------------|-----------------------------|
| **Local (MailHog)** | MailHog en tu PC | No. Los captura y los muestra en una web |
| **Producción (SES)** | AWS SES | Sí. Se envía a Gmail, Outlook, etc. |

---

## 2. Desarrollo local: dos opciones

### Opción A: MailHog (recomendada para probar emails)

**Qué es:** Un programa que simula un servidor de correo. Cuando tu app "envía" un email, MailHog lo intercepta y lo muestra en una página web. **Ningún correo sale de tu computadora.**

**Cuándo usarla:** Cuando quieres probar que los emails se generan bien (recuperación de contraseña, facturas, etc.).

**Pasos:**

1. **Levantar MailHog** (una sola vez por sesión de desarrollo):
   ```bash
   docker compose -f docker-compose.mailhog.yml up -d
   ```

2. **Configurar tu `.env`** (ya está listo si usaste la plantilla):
   ```
   EMAIL_TRANSPORT=mailhog
   SMTP_HOST=localhost
   SMTP_PORT=1025
   ```

3. **Ver los correos:** Abre http://localhost:8025 en el navegador. Cada vez que la app "envíe" un correo, aparecerá ahí.

### Opción B: Deshabilitar emails

**Qué es:** La app no envía nada. Los métodos de email se ejecutan pero no hacen nada (no crashea).

**Cuándo usarla:** Cuando estás trabajando en otra cosa y no te importan los correos.

**Configuración:**
```
EMAIL_TRANSPORT=disabled
```

No necesitas SMTP_HOST, SMTP_PORT ni nada más.

---

## 3. Producción: AWS SES

**Qué es:** Amazon Simple Email Service. Un servicio real que envía correos a cualquier dirección (Gmail, Outlook, etc.).

**De dónde sacar las variables:**

### Paso 1: Entrar a AWS

1. Ve a https://console.aws.amazon.com
2. Busca **SES** (Simple Email Service) en la barra de búsqueda
3. Asegúrate de estar en la región correcta (ej. **us-east-1**)

### Paso 2: Verificar tu dominio o email

Para enviar desde `noreply@jacapp.online`, debes verificar que eres dueño de ese dominio.

1. SES → **Verified identities** → **Create identity**
2. Elige **Domain**
3. Escribe: `jacapp.online`
4. **Create identity**
5. SES te mostrará unos registros DNS (CNAME, etc.). Añádelos en el panel de tu proveedor de dominios (donde compraste jacapp.online)
6. Espera a que el estado pase a **Verified** (minutos u horas)

**Alternativa rápida:** Si solo quieres probar, puedes verificar un email concreto (ej. tu Gmail) en vez del dominio. Pero en producción necesitas el dominio.

### Paso 3: Crear credenciales SMTP

1. SES → menú izquierdo → **SMTP settings**
2. Clic en **Create SMTP credentials**
3. Nombre (ej. `jac-app-smtp`) → **Create user**
4. **¡IMPORTANTE!** Se muestra la contraseña **una sola vez**. Cópiala y guárdala.
5. El **SMTP username** empieza con `AKIA...` — ese es tu `SMTP_USER`
6. La **SMTP password** que copiaste es tu `SMTP_PASS`

### Paso 4: Variables para `.env.production`

| Variable | Valor | De dónde sale |
|----------|-------|---------------|
| `EMAIL_TRANSPORT` | `ses` | Fijo |
| `SMTP_HOST` | `email-smtp.us-east-1.amazonaws.com` | Depende de la región. Ver tabla en EMAIL_SES_SETUP.md |
| `SMTP_PORT` | `587` | Fijo para SES |
| `SMTP_USER` | `AKIA...` (20 caracteres) | Paso 3: "SMTP username" |
| `SMTP_PASS` | Contraseña larga | Paso 3: "SMTP password" (solo se muestra una vez) |
| `EMAIL_FROM` | `JAC App <noreply@jacapp.online>` | Debe ser un email del dominio verificado |
| `APP_PUBLIC_URL` | `https://jacapp.online` | Tu dominio en producción |

---

## 4. Resumen de variables por entorno

### Local (MailHog)

| Variable | Valor |
|----------|-------|
| EMAIL_TRANSPORT | mailhog |
| SMTP_HOST | localhost |
| SMTP_PORT | 1025 |
| SMTP_USER | (dejar vacío o no poner) |
| SMTP_PASS | (dejar vacío o no poner) |
| EMAIL_FROM | JAC App \<noreply@localhost\> |
| APP_PUBLIC_URL | http://localhost:4200 |

### Local (emails deshabilitados)

| Variable | Valor |
|----------|-------|
| EMAIL_TRANSPORT | disabled |

### Producción (SES)

| Variable | Valor |
|----------|-------|
| EMAIL_TRANSPORT | ses |
| SMTP_HOST | email-smtp.us-east-1.amazonaws.com |
| SMTP_PORT | 587 |
| SMTP_USER | (credencial de SES) |
| SMTP_PASS | (credencial de SES) |
| EMAIL_FROM | JAC App \<noreply@jacapp.online\> |
| APP_PUBLIC_URL | https://jacapp.online |

---

## 5. ¿Qué correos envía la app?

- **Recuperación de contraseña:** Código de 6 dígitos
- **Factura pendiente:** Cuando se genera una factura nueva
- **Suscripción por vencer:** 1 y 3 días antes del vencimiento
- **Suscripción vencida:** Cuando el cron marca la suscripción como vencida
- **Pago confirmado:** Cuando se registra el pago de una factura

Todos usan la misma configuración (EMAIL_FROM, APP_PUBLIC_URL, etc.).

---

## 6. Flujo visual

```
DESARROLLO LOCAL (MailHog)
──────────────────────────
Usuario hace "Olvidé contraseña"
        ↓
Backend genera código y llama EmailService.enviarCodigoRecuperacion()
        ↓
Nodemailer envía a localhost:1025 (MailHog)
        ↓
MailHog captura el correo
        ↓
Tú abres http://localhost:8025 y ves el correo con el código


PRODUCCIÓN (SES)
────────────────
Usuario hace "Olvidé contraseña"
        ↓
Backend genera código y llama EmailService.enviarCodigoRecuperacion()
        ↓
Nodemailer envía a email-smtp.us-east-1.amazonaws.com:587 (AWS SES)
        ↓
SES entrega el correo al servidor del destinatario (Gmail, etc.)
        ↓
El usuario recibe el correo en su bandeja
```

---

## 7. Problemas frecuentes

**"Los correos no aparecen en MailHog"**
- ¿Está MailHog corriendo? `docker compose -f docker-compose.mailhog.yml ps`
- ¿Tienes `EMAIL_TRANSPORT=mailhog` en el .env?
- ¿Reiniciaste el backend después de cambiar el .env?

**"SES rechaza el envío"**
- ¿El dominio o email está verificado? (estado "Verified" en SES)
- ¿Estás en sandbox? En sandbox solo puedes enviar a direcciones verificadas
- ¿Las credenciales SMTP son correctas?

**"No quiero configurar nada por ahora"**
- Pon `EMAIL_TRANSPORT=disabled`. La app funcionará; los correos simplemente no se enviarán.
