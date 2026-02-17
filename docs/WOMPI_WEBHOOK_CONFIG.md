# Configuración del webhook Wompi

Para que el webhook registre el pago automáticamente (sin esperar al retorno del usuario), debes configurar la URL de eventos en el dashboard de Wompi.

---

## 1. URL del webhook

El endpoint es:

```
POST /api/webhooks/wompi
```

**URL completa** (ejemplo producción):

```
https://tu-dominio.com/api/webhooks/wompi
```

**Desarrollo local:** Wompi no puede alcanzar `localhost`. Necesitas un túnel (ngrok, etc.):

```bash
ngrok http 3000
# Usa la URL HTTPS que te da: https://abc123.ngrok.io/api/webhooks/wompi
```

---

## 2. Dónde configurar en Wompi

**Cada junta** usa sus propias credenciales Wompi. La URL de eventos se configura en el dashboard de la cuenta Wompi de esa junta.

1. Entra al [Dashboard de comercios](https://comercios.wompi.co/) (con la cuenta Wompi de la junta)
2. **Desarrollo** → **Programadores** → **Pagos a terceros** (o equivalente)
3. Busca **URL de eventos** / **Eventos**
4. Configura una URL por ambiente:
   - **Sandbox:** `https://tu-url/api/webhooks/wompi`
   - **Producción:** `https://tu-dominio.com/api/webhooks/wompi`

---

## 3. Cómo sabe la junta cuál es la URL

El admin de la junta ve la URL en **Mi JAC → Configuración**. La app la muestra automáticamente cuando el backend tiene configurado `API_PUBLIC_URL` en `.env`. La junta solo tiene que copiarla y pegarla en su dashboard de Wompi.

## 4. Requisitos por junta

Cada junta debe tener configurado el **Events Secret** (wompiEventsSecret) en Mi JAC → Configuración (o Platform → Juntas). Sin él, el webhook rechazará con "Junta sin webhook configurado".

El Events Secret debe ser el mismo que aparece en el dashboard de Wompi para esa cuenta/merchant.

---

## 5. Flujo

```
Usuario paga en Wompi
    → Wompi envía POST /api/webhooks/wompi (event: transaction.updated)
    → Backend valida firma con wompiEventsSecret de la junta
    → Backend llama registrarPagoDesdeProveedor
    → Pago queda registrado

Usuario llega a /pagos/retorno
    → Frontend llama verificar
    → Si el webhook ya registró → PagoDuplicadoError → devuelve registrado: true
    → Si el webhook falló → verificar consulta Wompi y registra (rescate)
```

---

## 6. Checklist

- [ ] URL de eventos configurada en Wompi (sandbox y/o producción)
- [ ] URL accesible desde internet (HTTPS en producción; ngrok en local)
- [ ] Junta con wompiEventsSecret configurado
- [ ] Events Secret coincide con el del dashboard de Wompi

---

## 7. Probar en local con ngrok

### Paso 1: Instalar ngrok

**Windows (PowerShell):**
```powershell
winget install ngrok
# o descarga desde https://ngrok.com/download
```

**Con npm:**
```bash
npm install -g ngrok
```

### Paso 2: Crear cuenta (gratis)

1. Regístrate en [ngrok.com](https://ngrok.com)
2. Copia tu authtoken del dashboard
3. Configura: `ngrok config add-authtoken TU_TOKEN`

### Paso 3: Iniciar backend y ngrok

**Terminal 1 – Backend:**
```bash
cd apps/backend
npm run start:dev
```
El backend debe estar en el puerto 3000 (o el que tengas en `.env`).

**Terminal 2 – ngrok:**
```bash
ngrok http 3000
```

### Paso 4: Copiar la URL

ngrok mostrará algo como:

```
Forwarding   https://a1b2c3d4.ngrok-free.app -> http://localhost:3000
```

La URL base es `https://a1b2c3d4.ngrok-free.app` (la tuya será distinta).

### Paso 5: Configurar API_PUBLIC_URL y Wompi

En `apps/backend/.env` define `API_PUBLIC_URL` con la URL de ngrok para que la junta vea la URL del webhook en Mi JAC → Configuración:

```
API_PUBLIC_URL=https://a1b2c3d4.ngrok-free.app
```

Luego, en el dashboard de Wompi → URL de eventos (Sandbox):

```
https://a1b2c3d4.ngrok-free.app/api/webhooks/wompi
```

Sustituye por tu URL real de ngrok.

### Paso 6: Probar

1. Haz un pago de prueba (tarjeta `4242 4242 4242 4242`)
2. Wompi enviará el webhook a tu URL
3. El pago debería registrarse automáticamente
4. En la consola de ngrok verás la petición `POST /api/webhooks/wompi`

### Notas

- **URL temporal:** En el plan gratuito, la URL cambia cada vez que reinicias ngrok. Tendrás que actualizar la URL en Wompi si reinicias.
- **Plan de pago:** Con plan de pago puedes tener una URL fija (ej. `https://jac-webhook.ngrok.io`).
