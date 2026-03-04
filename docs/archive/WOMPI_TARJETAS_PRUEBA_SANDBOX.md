# Tarjetas y datos de prueba – Wompi Sandbox

Referencia para pruebas de pagos en ambiente Sandbox. Fuente: [Wompi Docs – Datos de prueba en Sandbox](https://docs.wompi.co/docs/colombia/datos-de-prueba-en-sandbox/).

---

## Requisito previo

Usar la **llave pública de comercio para Sandbox** (prefijo `pub_test_`).

---

## Tarjetas de crédito/débito

| Número de tarjeta | Resultado |
|-------------------|-----------|
| `4242 4242 4242 4242` | **APPROVED** (aprobada) |
| `4111 1111 1111 1111` | **DECLINED** (declinada) |

**Para ambas tarjetas, Wompi sí pide CVC y fecha de expiración.** Puedes usar:

| Campo | Valor de prueba |
|-------|-----------------|
| **Fecha expiración** | Cualquier fecha futura (ej. `12/30`) |
| **CVC** | Cualquier 3 dígitos (ej. `123`) |

**Cualquier otro número de tarjeta** → transacción en estado `ERROR`.

---

## Nequi

| Número de teléfono | Resultado |
|-------------------|-----------|
| `3991111111` | **APPROVED** |
| `3992222222` | **DECLINED** |

Cualquier otro número → `ERROR`.

---

## PSE

| Código institución | Resultado |
|--------------------|-----------|
| `1` | **APPROVED** |
| `2` | **DECLINED** |

En el Widget: elegir "Banco que aprueba" o "Banco que rechaza".

---

## DAVIPLATA – Pago simple

| Código OTP | Resultado |
|------------|-----------|
| `574829` | **APPROVED** |
| `932015` | **DECLINED** |
| `186743` | **DECLINED** (sin saldo) |
| `999999` | **ERROR** |

---

## DAVIPLATA – Pago recurrente (token)

| Número | Resultado |
|--------|-----------|
| `3991111111` | Token aprobado, transacciones **APPROVED** |
| `3992222222` | Token aprobado, transacciones **DECLINED** |
| `3993333333` | **DECLINED** (monedero inválido) |

| Código OTP | Resultado |
|------------|-----------|
| `574829` | Token **APPROVED** |
| `932016` | Token **DECLINED** (suscripción ya existente) |
| Cualquier otro de 6 dígitos | Código OTP inválido |

---

## Bancolombia QR

En el Widget: elegir estado final (APROBADA, DECLINADA, ERROR).

---

## Botón de Transferencia Bancolombia

Tras iniciar la transacción, usar la URL en `data.payment_method.async_payment_url` para simular el estado final.

---

## Puntos Colombia

| `sandbox_status` | Resultado |
|------------------|-----------|
| `APPROVED_ONLY_POINTS` | Pago total con puntos |
| `APPROVED_HALF_POINTS` | Pago 50% con puntos |
| `DECLINED` | Pago declinado |
| `ERROR` | Error al pagar con puntos |

---

## Resumen rápido para pruebas E2E

| Método | Aprobar | Declinar |
|--------|--------|----------|
| Tarjeta | `4242 4242 4242 4242` | `4111 1111 1111 1111` |
| Nequi | `3991111111` | `3992222222` |
| PSE | Código `1` | Código `2` |
| Daviplata | OTP `574829` | OTP `932015` |

---

## Errores frecuentes en consola

| Error | Causa | Solución |
|-------|-------|----------|
| `publicKey: ['Formato inválido']` | Public key mal configurada o formato incorrecto | En Mi JAC → Configuración, verifica que la **Public Key** sea exactamente la del dashboard Wompi: `pub_test_xxx` (sandbox) o `pub_prod_xxx` (producción). Sin espacios ni caracteres extra. |
| `hotjar.js ERR_BLOCKED_BY_CLIENT` | Bloqueador de anuncios o privacy | Ignorar: es Hotjar (analytics de Wompi). No afecta el pago. |
| `check_pco_blacklist 404` | Endpoint Puntos Colombia opcional | Ignorar: no bloquea el checkout. |

---

## URL de retorno (redirect)

La URL de retorno se configura en **WOMPI_REDIRECT_URL** (`.env` del backend). Debe coincidir con el puerto donde corre tu frontend:

| Frontend | WOMPI_REDIRECT_URL |
|----------|--------------------|
| Angular (ng serve, puerto 4200) | `http://localhost:4200/pagos/retorno` |
| Vite u otro (puerto 5173) | `http://localhost:5173/pagos/retorno` |

Tras cambiar `.env`, reinicia el backend. Los nuevos payment links usarán la URL correcta.

**HTTPS:** En local, `http://localhost` suele ser aceptado. En producción usa `https://tudominio.com/pagos/retorno`.

**Webhook:** Para que el pago se registre automáticamente (sin esperar al retorno), configura la URL de eventos en Wompi. Ver `WOMPI_WEBHOOK_CONFIG.md`.
