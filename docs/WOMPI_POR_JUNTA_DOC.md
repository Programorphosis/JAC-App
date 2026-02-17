# Documentación técnica: Wompi por junta

**Versión:** 1.0  
**Estado:** Implementado  
**Última actualización:** 2025-02-17

---

## 1. Resumen ejecutivo

Cada junta configura sus propias credenciales Wompi. Los pagos de afiliados (cuota junta, carta) van directo a la cuenta Bancolombia de la junta. La plataforma usa credenciales globales solo para facturación (suscripciones).

---

## 2. Modelo de datos

### 2.1 Campos en Junta

```prisma
model Junta {
  // ... campos existentes ...

  // Wompi – credenciales por junta (encriptadas)
  wompiPrivateKey      String?   // prv_test_... o prv_prod_...
  wompiPublicKey       String?   // pub_test_... o pub_prod_...
  wompiIntegritySecret String?   // test_integrity_... o prod_integrity_...
  wompiEventsSecret    String?   // test_events_... o prod_events_...
  wompiEnvironment     String?   // "sandbox" | "production"
}
```

### 2.2 Encriptación

- **Algoritmo:** AES-256-GCM
- **Clave maestra:** `ENCRYPTION_MASTER_KEY` (32 bytes hex)
- **Formato en BD:** Base64 del ciphertext (IV + authTag incluidos en el payload)
- **Servicio:** `EncryptionService.encrypt(plaintext)`, `decrypt(ciphertext)`

### 2.3 Cuándo se usan

| Campo | Uso |
|-------|-----|
| wompiPrivateKey | Crear payment link, consultar transacción |
| wompiPublicKey | (Reservado para widget embebido si se implementa) |
| wompiIntegritySecret | (Reservado para firma de integridad en widget) |
| wompiEventsSecret | Validar firma del webhook |
| wompiEnvironment | Determinar URL base API (sandbox vs production) |

---

## 3. API

### 3.1 Platform Admin

**PATCH /platform/juntas/:id/wompi**

```json
// Request
{
  "wompiPrivateKey": "prv_test_...",
  "wompiPublicKey": "pub_test_...",
  "wompiIntegritySecret": "test_integrity_...",
  "wompiEventsSecret": "test_events_...",
  "wompiEnvironment": "sandbox"
}
```

- Todos los campos opcionales.
- String vacío = borrar valor (guardar null).
- Credenciales se encriptan antes de guardar.
- Respuesta: 200 sin devolver credenciales.

**GET /platform/juntas/:id**

- No incluir credenciales en la respuesta.
- Incluir `wompiConfigurado: boolean` (derivado de wompiPrivateKey != null).

### 3.2 Verificación de pago (retorno)

**GET /pagos/online/verificar?transaction_id=XXX&junta_id=YYY**

- `junta_id` obligatorio.
- Validar que `req.user.juntaId === junta_id`.
- Usar credenciales de junta_id para consultar Wompi.

**Respuesta 200:** `{ data: { registrado, codigo, mensaje, pagoId?, monto?, consecutivo?, status? } }`

| codigo | registrado | Descripción |
|--------|------------|-------------|
| REGISTRADO_AHORA | true | Verificar registró el pago (rescate si webhook falló) |
| YA_REGISTRADO | true | Webhook ya lo registró; mensaje positivo al usuario |
| TRANSACCION_NO_ENCONTRADA | false | No se pudo consultar en Wompi |
| TRANSACCION_PENDIENTE | false | PENDING, IN_PROCESS, CREATED |
| TRANSACCION_RECHAZADA | false | DECLINED, VOIDED, ERROR |
| INTENCION_NO_ENCONTRADA | false | Intención no existe o monto no coincide |
| ESTADO_DESCONOCIDO | false | Otro estado en Wompi |

---

## 4. Flujos detallados

### 4.1 Crear intención de pago (JUNTA o CARTA)

```
PagosService.crearIntencionPagoOnline / crearIntencionPagoCartaOnline
│
├─ 1. Cargar Junta (incluir campos wompi*)
├─ 2. Si !junta.wompiPrivateKey → throw WompiNoConfiguradoError
├─ 3. credenciales = desencriptar(junta)
├─ 4. redirectUrl = `${WOMPI_REDIRECT_URL}?junta_id=${juntaId}`
├─ 5. link = wompi.crearPaymentLink(params, credenciales)
├─ 6. Guardar IntencionPago(wompiLinkId, juntaId, ...)
└─ 7. return { checkoutUrl: `https://checkout.wompi.co/l/${link.id}`, ... }
```

### 4.2 Webhook

```
POST /webhooks/wompi
│
├─ 1. Parsear body (event, data.transaction)
├─ 2. Si event !== 'transaction.updated' o status !== 'APPROVED' → return
├─ 3. payment_link_id = data.transaction.payment_link_id
├─ 4. intencion = IntencionPago.findByWompiLinkId(payment_link_id)
├─ 5. Si !intencion → return { received: true }
├─ 6. junta = Junta.find(intencion.juntaId)
├─ 7. Si !junta.wompiEventsSecret → throw (o return)
├─ 8. secret = decrypt(junta.wompiEventsSecret)
├─ 9. Validar checksum con secret
├─ 10. Si checksum inválido → throw BadRequest
└─ 11. registrarPagoDesdeProveedor(...)
```

### 4.3 Retorno (verificación)

```
Usuario llega a /pagos/retorno?junta_id=X&transaction_id=Y
│
├─ 1. Frontend extrae junta_id, transaction_id
├─ 2. GET /pagos/online/verificar?transaction_id=Y&junta_id=X
├─ 3. Backend valida user.juntaId === junta_id
├─ 4. credenciales = desencriptar(Junta.find(junta_id))
├─ 5. tx = wompi.obtenerTransaccion(Y, credenciales)
├─ 6. Si tx.status === 'APPROVED' → registrarPagoDesdeProveedor
└─ 7. return { registrado: true/false, ... }
```

---

## 5. Interfaces y tipos

### 5.1 WompiCredenciales

```typescript
export interface WompiCredenciales {
  privateKey: string;
  environment: 'sandbox' | 'production';
}
```

### 5.2 WompiService (firma de métodos)

```typescript
crearPaymentLink(
  params: CrearPaymentLinkParams,
  credenciales: WompiCredenciales
): Promise<{ id: string }>;

obtenerTransaccion(
  transactionId: string,
  credenciales: WompiCredenciales
): Promise<TransaccionWompi | null>;
```

---

## 6. Variables de entorno

### 6.1 Nuevas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| ENCRYPTION_MASTER_KEY | Clave para encriptar credenciales en BD | 64 caracteres hex |

### 6.2 Existentes (facturación plataforma)

Las variables `WOMPI_*` actuales se reservan para facturación de la plataforma. No se usan para pagos junta.

| Variable | Uso |
|----------|-----|
| WOMPI_PRIVATE_KEY | Facturación plataforma |
| WOMPI_PUBLIC_KEY | Facturación plataforma |
| WOMPI_EVENTS_SECRET | (Si la plataforma recibe webhooks de sus pagos) |
| WOMPI_REDIRECT_URL | Base para redirect; se añade junta_id |

---

## 7. Seguridad

- Credenciales nunca en logs.
- Credenciales nunca en respuestas API (excepto en el formulario de edición, que es protegido).
- Encriptación en reposo con clave maestra.
- Validación de firma en webhook obligatoria.
- Verificación de retorno: user debe pertenecer a la junta.

---

## 8. Errores específicos

| Error | Cuándo |
|-------|--------|
| WompiNoConfiguradoError | Junta sin wompiPrivateKey al crear intención |
| BadRequest: junta_id requerido | Verificar sin junta_id |
| Forbidden: junta no coincide | user.juntaId !== junta_id en verificar |
| BadRequest: Checksum inválido | Webhook con firma incorrecta |

---

## 9. Referencias cruzadas

- Plan: `WOMPI_POR_JUNTA_PLAN.md`
- Roadmap: `WOMPI_POR_JUNTA_ROADMAP.md`
- Variables env: `WOMPI_VARIABLES_ENTORNO.md`
- Guía configuración: `WOMPI_CONFIGURAR_JUNTA.md`
- Webhook: `WOMPI_WEBHOOK_CONFIG.md`
- Tarjetas prueba: `WOMPI_TARJETAS_PRUEBA_SANDBOX.md`
- Flujo pagos: `flujoDePagos.md`
