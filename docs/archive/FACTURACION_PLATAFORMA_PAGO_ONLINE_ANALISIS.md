# Análisis: Pago online de facturación plataforma

**Objetivo:** Revisión del estado actual y análisis de lo que falta para implementar el pago online de facturas (junta → plataforma) con Wompi, manteniendo el código limpio, escalable, mantenible y profesional.

**Contexto:** Implementación completada. La tarea 7.5 del roadmap Wompi por junta puede ejecutarse una vez configurada la cuenta Wompi plataforma y probado el flujo.

---

## 0. Principio arquitectónico: separación plataforma vs juntas

**Objetivo estratégico:** La plataforma de administración se migrará en el futuro a un **microservicio y frontend aparte**. Por tanto, todo lo relacionado con la plataforma debe ir **bien separado** del código de las juntas.

| Ámbito | Ubicación actual | Regla |
|--------|------------------|-------|
| **Backend plataforma** | `platform/` | Toda la lógica de facturación, suscripciones, juntas CRUD, etc. vive aquí. Sin dependencias inversas desde `application/`. |
| **Backend juntas** | `application/` | Pagos de afiliados, usuarios, cartas, etc. No debe conocer detalles de facturación plataforma. |
| **Frontend plataforma** | `features/platform/` | Rutas `/platform/*`. Módulo autocontenido, separable. |
| **Frontend juntas** | `features/` (resto) | Rutas de junta. El módulo facturas-plataforma es la vista que la junta tiene de sus facturas; vive en el frontend de juntas pero consume API de plataforma. |

**Implicaciones para esta implementación:**

1. **IntencionPagoFactura, crear intención, verificar:** Todo en `platform/facturas/`. Cero lógica en `application/pagos`.
2. **Webhook:** Es el único punto de acoplamiento compartido. Al migrar, el microservicio plataforma podría exponer su propio endpoint de webhook, o el endpoint actual podría delegar a un servicio plataforma. Diseñar para que la rama "facturas" sea fácil de extraer.
3. **WompiService:** Infraestructura compartida (OK). Las credenciales se pasan por parámetro o env; no hay acoplamiento de dominio.
4. **Frontend:** El flujo de pago de facturas (crear intención, retorno) vive en el módulo de facturas-plataforma, que usa el frontend de juntas. Al migrar, ese módulo se movería al frontend de plataforma.

*Referencia: `PLAN_ADMINISTRADOR_PLATAFORMA.md` §1.3 – Módulos autocontenidos para futura extracción.*

---

## 1. Estado actual

### 1.1 Lo que SÍ existe (facturación plataforma)

| Componente | Estado | Descripción |
|------------|--------|-------------|
| Modelo `Factura` | ✅ | juntaId, monto, estado, tipo (MENSUAL, MANUAL, AJUSTE) |
| Modelo `PagoFactura` | ✅ | facturaId, monto, metodo (incluye ONLINE), referencia |
| `PlatformFacturasService` | ✅ | CRUD facturas, generar mensuales, registrar pago |
| Cron facturas mensuales | ✅ | Día 1 de cada mes |
| Frontend `/facturas-plataforma` | ✅ | Lista facturas (solo lectura) |
| Registro manual de pago | ✅ | Platform admin registra TRANSFERENCIA, EFECTIVO, etc. |
| Variables `WOMPI_*` en env | ✅ | Reservadas, no usadas por ningún flujo |

### 1.2 Implementado (pago online)

| Componente | Estado | Descripción |
|------------|--------|-------------|
| Crear intención de pago (factura) | ✅ | POST /facturas-plataforma/intencion (solo TESORERA) |
| Modelo `IntencionPagoFactura` | ✅ | prisma/schema.prisma |
| Webhook para facturas | ✅ | WebhooksController rama facturas con WOMPI_EVENTS_SECRET |
| Retorno/verificación facturas | ✅ | GET /facturas-plataforma/verificar, ruta /facturas-plataforma/retorno |
| Botón "Pagar ahora" | ✅ | Solo visible para TESORERA en facturas pendientes |

### 1.3 Flujo actual de pago de facturas

```
Junta ve facturas pendientes
    → "Contacte al administrador de la plataforma para realizar pagos"
    → Admin plataforma recibe transferencia/efectivo fuera del sistema
    → Admin registra manualmente: POST /platform/juntas/:id/facturas/:facturaId/pago
    → metodo: TRANSFERENCIA | EFECTIVO | CHEQUE | OTRO (ONLINE existe en enum pero no se usa)
```

---

## 2. Comparativa: Pagos junta vs Facturación plataforma

| Aspecto | Pagos junta (afiliados→junta) | Facturación plataforma (junta→plataforma) |
|---------|-------------------------------|------------------------------------------|
| **Credenciales Wompi** | Por junta (Junta.wompi* en BD) | Globales (WOMPI_* en .env) |
| **Cuenta destino** | Bancolombia de la junta | Bancolombia de la plataforma |
| **Intención** | `IntencionPago` (juntaId, usuarioId, tipoPago) | No existe → requiere `IntencionPagoFactura` |
| **Crear payment link** | `PagosService` + credenciales junta | Nuevo servicio + credenciales env (sin pasar params) |
| **Webhook** | payment_link_id → IntencionPago → juntaId → wompiEventsSecret junta | payment_link_id → IntencionPagoFactura → validar con WOMPI_EVENTS_SECRET env |
| **URL retorno** | `/pagos/retorno?junta_id=X&transaction_id=Y` | `/facturas-plataforma/retorno?factura_id=X&transaction_id=Y` |
| **Registrar pago** | `registrarPagoDesdeProveedor` → modelo `Pago` | `PlatformFacturasService.registrarPago` → modelo `PagoFactura` |
| **Quién paga** | Afiliado (usuario de junta) | Solo TESORERA (maneja finanzas junta) |

---

## 3. Webhook: un endpoint, dos orígenes

El endpoint `POST /api/webhooks/wompi` recibe eventos de **todas** las cuentas Wompi que lo configuran:

- **Cuentas junta:** cada junta configura la misma URL en su dashboard; el `payment_link_id` apunta a `IntencionPago`.
- **Cuenta plataforma:** la plataforma (cuenta con WOMPI_* env) configuraría la misma URL; el `payment_link_id` apuntaría a `IntencionPagoFactura`.

**Lógica propuesta:**

```
1. Recibir evento transaction.updated, status APPROVED
2. payment_link_id = tx.payment_link_id
3. Buscar IntencionPago por wompiLinkId
4. Si existe → flujo actual (validar con wompiEventsSecret de junta, registrarPagoDesdeProveedor)
5. Si no existe → buscar IntencionPagoFactura por wompiLinkId
6. Si existe → validar con WOMPI_EVENTS_SECRET env, registrarPagoFactura
7. Si no existe → return { received: true } (ignorar)
```

**Importante:** La cuenta Wompi de la plataforma debe tener configurada la URL de eventos en su dashboard. Es una configuración distinta a la de cada junta.

---

## 4. Redirect y verificación

| Flujo | Redirect URL (Wompi) | Frontend | Backend verificar |
|-------|----------------------|----------|-------------------|
| Pagos junta | `WOMPI_REDIRECT_URL?junta_id=X` (se añade) | `/pagos/retorno` | `GET /pagos/online/verificar?transaction_id=&junta_id=` |
| Facturas | Nueva: `WOMPI_REDIRECT_FACTURAS?factura_id=X` | `/facturas-plataforma/retorno` | `GET /facturas-plataforma/verificar?transaction_id=&factura_id=` |

**Variable env sugerida:** `WOMPI_REDIRECT_URL_FACTURAS` o reutilizar `WOMPI_REDIRECT_URL` con query param `tipo=factura&factura_id=X` para mantener una sola base URL.

---

## 5. Modelo de datos propuesto

### 5.1 IntencionPagoFactura

```prisma
model IntencionPagoFactura {
  id             String   @id @default(uuid())
  facturaId      String
  factura        Factura  @relation(fields: [facturaId], references: [id], onDelete: Cascade)
  juntaId        String
  junta          Junta    @relation(fields: [juntaId], references: [id], onDelete: Cascade)
  montoCents     Int
  wompiLinkId   String   @unique
  iniciadoPorId String
  iniciadoPor   Usuario  @relation(fields: [iniciadoPorId], references: [id], onDelete: Cascade)
  fechaCreacion DateTime @default(now())

  @@index([juntaId])
  @@index([facturaId])
}
```

**Nota:** La factura puede tener pagos parciales. La intención debe validar que el monto coincida con el pendiente (factura.monto - totalPagado).

---

## 6. Arquitectura propuesta (limpia y escalable)

### 6.1 Principios

1. **Separación plataforma vs juntas (migración futura):** Todo lo de plataforma en `platform/`. Cero dependencias de `application/pagos` en facturación. Diseño pensado para extraer el módulo plataforma a microservicio y frontend aparte.
2. **Separación de dominios:** Pagos junta (application/pagos) vs Facturación plataforma (platform/facturas). No mezclar lógica.
3. **WompiService compartido:** Infraestructura; ya acepta credenciales opcionales. Sin credenciales usa env. Reutilizar.
4. **Webhook único, dispatch por tipo:** Un controller por ahora. La rama facturas debe ser un bloque claro (if/else o delegación) para facilitar extracción futura a microservicio.
5. **Servicios por responsabilidad:** `PlatformFacturasService` ya existe; añadir métodos para pago online aquí. No crear servicios en `application/` para facturas.

### 6.2 Estructura de archivos sugerida

```
platform/                              # Módulo autocontenido, extraíble
  facturas/
    platform-facturas.service.ts        # Ya existe; añadir crearIntencionPagoFactura
    platform-facturas.controller.ts    # Ya existe (admin)
    platform-facturas-public.controller.ts  # Añadir POST crear-intencion, GET verificar
  dto/
    crear-intencion-pago-factura.dto.ts

application/                           # No tocar para facturas
  webhooks/
    webhooks.controller.ts              # Único punto compartido: extender con rama facturas
                                        # (dispatch; al migrar, esta rama se extrae)
```

**Nota migración:** El webhook es compartido porque Wompi envía a una sola URL. Al separar microservicio plataforma, opciones: (a) el webhook actual delega a un cliente HTTP del microservicio plataforma, o (b) la cuenta Wompi plataforma apunta a una URL distinta del microservicio. La rama facturas debe estar aislada en código para facilitar la extracción.

### 6.3 Flujo completo (propuesto)

```
1. Usuario TESORERA en /facturas-plataforma
   → Clic "Pagar ahora" en factura pendiente
   → POST /facturas-plataforma/intencion { facturaId }
   → Backend: validar factura pertenece a junta del user, monto pendiente > 0
   → WompiService.crearPaymentLink(params, undefined)  // usa env
   → redirectUrl = WOMPI_REDIRECT_URL + "?tipo=factura&factura_id=" + facturaId
   → Guardar IntencionPagoFactura
   → Return { checkoutUrl }

2. Usuario paga en Wompi (dinero → cuenta plataforma)

3a. Webhook: payment_link_id no en IntencionPago
    → Buscar IntencionPagoFactura
    → Validar checksum con WOMPI_EVENTS_SECRET
    → PlatformFacturasService.registrarPago(..., metodo: ONLINE, referenciaExterna: tx.id)

3b. Retorno: Usuario llega a /facturas-plataforma/retorno?factura_id=X&transaction_id=Y
    → GET /facturas-plataforma/verificar?factura_id=X&transaction_id=Y
    → Backend: validar user.juntaId === factura.juntaId
    → WompiService.obtenerTransaccion(id, undefined)  // usa env
    → Si APPROVED → registrarPago (metodo ONLINE)
    → Return { registrado, ... }
```

---

## 7. Checklist de implementación

### Fase 1: Modelo y backend base

- [x] Migración: modelo `IntencionPagoFactura`
- [x] `PlatformFacturasService.crearIntencionPagoFactura(facturaId, juntaId, userId)`
- [x] Validar: factura pendiente/parcial, monto pendiente > 0, factura.juntaId === juntaId
- [x] `PlatformFacturasService.registrarPagoDesdeProveedorFactura(transactionId, amountInCents, paymentLinkId)`

### Fase 2: Webhook

- [x] Extender `WebhooksController`: si no IntencionPago, buscar IntencionPagoFactura
- [x] Validar checksum con `WOMPI_EVENTS_SECRET` (env) para facturas
- [x] Llamar a registrar pago factura

### Fase 3: Retorno y verificación

- [x] `GET /facturas-plataforma/verificar?factura_id=&transaction_id=`
- [x] Validar user.juntaId === factura.juntaId
- [x] Consultar Wompi (credenciales env), registrar si APPROVED
- [x] Frontend: ruta `/facturas-plataforma/retorno`, componente de retorno

### Fase 4: Frontend

- [x] Botón "Pagar ahora" en facturas pendientes
- [x] Flujo: crear intención → redirect checkout → retorno → mensaje éxito/error
- [x] Variable env `WOMPI_REDIRECT_URL_FACTURAS`

### Fase 5: Configuración y documentación

- [ ] Cuenta Wompi plataforma: configurar URL de eventos en dashboard
- [x] Documentar en WOMPI_VARIABLES_ENTORNO.md
- [ ] Actualizar 7.5: cuando exista el flujo, verificar que no se afecta

---

## 8. Consideraciones de seguridad

1. **Validación junta:** En verificar y crear intención, `user.juntaId === factura.juntaId`.
2. **Solo TESORERA:** Solo el rol TESORERA puede crear intención y verificar pago (maneja finanzas). ADMIN y SECRETARIA pueden ver facturas pero no pagar.
3. **Idempotencia:** `referenciaExterna` en PagoFactura = transaction.id para evitar duplicados.
4. **Checksum webhook:** Obligatorio validar con WOMPI_EVENTS_SECRET para eventos de cuenta plataforma.
5. **Sin credenciales en logs:** Mantener práctica actual.

---

## 9. Conclusión

El pago online de facturación plataforma **está implementado**. Las fases 1-4 del checklist están completas. Pendiente:

1. **Configuración manual:** Cuenta Wompi plataforma → URL de eventos en dashboard.
2. **Aplicar migración:** `npx prisma migrate deploy` (si no se ha ejecutado).
3. **Pruebas E2E:** Flujo completo con tarjeta sandbox.
4. **7.5:** Cuando el flujo esté probado, marcar en WOMPI_POR_JUNTA_ROADMAP.

La implementación mantiene la **separación plataforma vs juntas** (preparada para migración a microservicio y frontend aparte), reutiliza `WompiService` y extiende el webhook de forma limpia.
