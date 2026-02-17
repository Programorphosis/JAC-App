# Variables de entorno para integración Wompi

**Referencia:** docs.wompi.co (Colombia – recibir pagos), flujoDePagos.md

---

## 0. Dos usos de Wompi (importante)

| Uso | Credenciales | Dónde se configuran | Documentación |
|-----|--------------|---------------------|---------------|
| **Pagos junta** (afiliados → junta) | Por junta, en BD (Junta.wompi*) | Admin plataforma o Mi JAC → Configuración | `WOMPI_POR_JUNTA_DOC.md`, `WOMPI_CONFIGURAR_JUNTA.md` |
| **Facturación plataforma** (suscripciones junta → plataforma) | Variables de entorno (globales) | `.env` del backend | Esta sección |

**Resumen:**
- Las variables `WOMPI_*` en `.env` son **solo para facturación de la plataforma** (cobro de suscripciones a juntas).
- Los pagos de afiliados a juntas usan credenciales por junta (en BD, encriptadas). No usan estas variables.

---

## 1. Producto Wompi a usar

**Recibir pagos** (merchant): el afiliado paga a la junta. Usamos:
- **Payment Links** (links de pago) o **Widget/Checkout Web**
- API para crear links/transacciones
- Webhooks para confirmar pagos aprobados

No usamos "Pagos a Terceros" (payouts), que es para enviar dinero.

---

## 2. Variables requeridas

### 2.1 Autenticación API

| Variable | Descripción | Dónde obtener | Sandbox | Producción |
|----------|-------------|---------------|---------|------------|
| `WOMPI_PRIVATE_KEY` | Llave privada para llamadas API (crear links, consultar transacciones) | Dashboard → Desarrollo → Programadores | `prv_test_...` | `prv_prod_...` |
| `WOMPI_PUBLIC_KEY` | Llave pública para frontend (Widget/Checkout) | Mismo lugar | `pub_test_...` | `pub_prod_...` |

**Uso:** En requests a la API: `Authorization: Bearer {WOMPI_PRIVATE_KEY}`

### 2.2 Firma de integridad (transacciones)

| Variable | Descripción | Dónde obtener | Sandbox | Producción |
|----------|-------------|---------------|---------|------------|
| `WOMPI_INTEGRITY_SECRET` | Secreto para firmar transacciones (referencia + monto + moneda) | Dashboard → Mi cuenta → Secretos para integración técnica | `test_integrity_...` | `prod_integrity_...` |

**Uso:** SHA256(referencia + amountInCents + "COP" + WOMPI_INTEGRITY_SECRET) → se envía al frontend como `signature:integrity` para que Wompi valide que el monto no fue alterado.

### 2.3 Verificación de webhooks

| Variable | Descripción | Dónde obtener | Sandbox | Producción |
|----------|-------------|---------------|---------|------------|
| `WOMPI_EVENTS_SECRET` | Secreto para validar firma de eventos (webhooks) | Dashboard → Mi cuenta → Secretos para integración técnica | `test_events_...` | `prod_events_...` |

**Uso:** Validar que el webhook viene de Wompi: SHA256(propiedades del evento + timestamp + WOMPI_EVENTS_SECRET) y comparar con `X-Event-Checksum` o `signature.checksum`.

### 2.4 Ambiente y URLs

| Variable | Descripción | Valores |
|----------|-------------|---------|
| `WOMPI_ENVIRONMENT` | Ambiente de ejecución | `sandbox` \| `production` |
| *(derivado)* | URL base API | `sandbox` → `https://sandbox.wompi.co/v1`<br>`production` → `https://production.wompi.co/v1` |

---

## 3. Variable para credenciales por junta

| Variable | Descripción | Uso |
|----------|-------------|-----|
| `ENCRYPTION_MASTER_KEY` | Clave AES-256 (32 bytes hex) para encriptar credenciales Wompi en BD | Obligatoria si hay juntas con Wompi configurado. Ver `WOMPI_POR_JUNTA_DOC.md`. |

Generar: `openssl rand -hex 32`

---

## 4. Resumen para `.env`

```env
# ========== WOMPI (Facturación plataforma – reservado) ==========
# Obtener en: comercios.wompi.co → Desarrollo → Programadores
# Y en: Mi cuenta → Secretos para integración técnica

# Ambiente: sandbox (pruebas) | production (dinero real)
WOMPI_ENVIRONMENT=sandbox

# Llaves de autenticación (una por ambiente)
WOMPI_PRIVATE_KEY=prv_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WOMPI_PUBLIC_KEY=pub_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Secreto de integridad (firmar transacciones antes de enviar al checkout)
WOMPI_INTEGRITY_SECRET=test_integrity_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Secreto de eventos (verificar firma de webhooks)
WOMPI_EVENTS_SECRET=test_events_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# URL base de retorno (donde Wompi redirige al usuario tras pagar)
# El sistema añade ?junta_id=X automáticamente para pagos junta
# Debe ser una URL pública de tu frontend
WOMPI_REDIRECT_URL=http://localhost:4200/pagos/retorno

# URL de retorno para pago de facturas (junta → plataforma)
# Si no se define, se deriva de WOMPI_REDIRECT_URL
WOMPI_REDIRECT_URL_FACTURAS=http://localhost:4200/facturas-plataforma/retorno
```

---

## 5. Configuración en Dashboard Wompi

### 5.1 URL de eventos (webhook)

Configurar en: **Desarrollo → Programadores** (o equivalente para recibir pagos).

- **Sandbox:** `https://tu-dominio.com/api/webhooks/wompi` (o ngrok en desarrollo)
- **Producción:** `https://tu-dominio.com/api/webhooks/wompi`

Debe ser HTTPS y responder 200 OK.

### 5.2 Registro

1. Registrarse en [comercios.wompi.co](https://comercios.wompi.co)
2. Activar producto de **recibir pagos** (no Pagos a Terceros)
3. Configurar 2FA si lo pide para revelar llaves

---

## 6. Checklist antes de desarrollo

- [ ] Cuenta en comercios.wompi.co
- [ ] `WOMPI_PRIVATE_KEY` (sandbox)
- [ ] `WOMPI_PUBLIC_KEY` (sandbox)
- [ ] `WOMPI_INTEGRITY_SECRET` (sandbox)
- [ ] `WOMPI_EVENTS_SECRET` (sandbox)
- [ ] URL de webhook configurada en dashboard (ngrok para local)
- [ ] `WOMPI_REDIRECT_URL` apuntando al frontend

---

## 7. Producción

Para producción, repetir con llaves `prv_prod_*`, `pub_prod_*`, `prod_integrity_*`, `prod_events_*` y `WOMPI_ENVIRONMENT=production`.
