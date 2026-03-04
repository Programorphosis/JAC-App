# Wompi – Guía operativa

Configuración, webhooks, credenciales por junta, reconciliación y tarjetas de prueba. Para diseño y arquitectura ver `WOMPI_POR_JUNTA_PLAN.md`, `WOMPI_POR_JUNTA_DOC.md`.

---

## 1. Dos usos de Wompi

| Uso | Credenciales | Dónde |
|-----|--------------|-------|
| **Pagos junta** (afiliados → junta) | Por junta, en BD (Junta.wompi*) | Mi JAC → Configuración o Platform → Juntas |
| **Facturación plataforma** (suscripciones) | Variables de entorno | `.env` del backend |

---

## 2. Variables de entorno (.env)

### Facturación plataforma

| Variable | Descripción |
|---------|-------------|
| `WOMPI_ENVIRONMENT` | `sandbox` \| `production` |
| `WOMPI_PRIVATE_KEY` | `prv_test_...` o `prv_prod_...` |
| `WOMPI_PUBLIC_KEY` | `pub_test_...` o `pub_prod_...` |
| `WOMPI_INTEGRITY_SECRET` | Firmar transacciones |
| `WOMPI_EVENTS_SECRET` | Verificar webhooks |
| `WOMPI_REDIRECT_URL` | URL de retorno tras pago (ej. `https://jacapp.online/app/pagos/retorno`) |
| `WOMPI_REDIRECT_URL_FACTURAS` | Retorno facturas plataforma |

### Credenciales por junta

| Variable | Descripción |
|---------|-------------|
| `ENCRYPTION_MASTER_KEY` | Clave AES-256 (32 bytes hex) para encriptar credenciales en BD. Generar: `openssl rand -hex 32` |

---

## 3. Webhook

**URL:** `POST /api/webhooks/wompi` → `https://tu-dominio.com/api/webhooks/wompi`

**Configurar en:** Dashboard Wompi → Desarrollo → Programadores → URL de eventos

**Local:** Wompi no alcanza localhost. Usar ngrok:
```bash
ngrok http 3000
# Configurar en Wompi: https://xxx.ngrok-free.app/api/webhooks/wompi
# En .env: API_PUBLIC_URL=https://xxx.ngrok-free.app
```

**Por junta:** Cada junta debe tener el **Secreto de eventos** (wompiEventsSecret) configurado en Mi JAC → Configuración, igual al del dashboard de Wompi de esa cuenta.

---

## 4. Configurar Wompi en una junta

1. Junta con cuenta en [comercios.wompi.co](https://comercios.wompi.co)
2. Platform Admin o Admin junta: Mi JAC → Configuración → Credenciales Wompi
3. Pegar: Llave privada, Llave pública, Secreto integridad, Secreto eventos
4. Seleccionar ambiente (sandbox/production)
5. En Wompi dashboard: URL de eventos = `https://tu-dominio.com/api/webhooks/wompi`

---

## 5. Reconciliación

Job diario 02:00 que compara transacciones APPROVED en Wompi vs pagos en BD; registra faltantes.

**Manual (PLATFORM_ADMIN):**
```bash
curl -X POST -H "Authorization: Bearer <JWT>" https://tu-dominio.com/api/internal/wompi-reconcile
```

---

## 6. Tarjetas de prueba (Sandbox)

| Tarjeta | Resultado |
|---------|-----------|
| `4242 4242 4242 4242` | APPROVED |
| `4111 1111 1111 1111` | DECLINED |

Fecha: cualquier futura (ej. 12/30). CVC: cualquier 3 dígitos.

**Nequi:** `3991111111` → APPROVED, `3992222222` → DECLINED

**PSE:** Institución 1 → APPROVED, 2 → DECLINED

---

## Referencias

- `WOMPI_POR_JUNTA_DOC.md` — Arquitectura técnica
- `flujoDePagos.md`, `flujoDePagosCasoFallaWebhook.md` — Flujos de pago
