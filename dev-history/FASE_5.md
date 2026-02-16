# Fase 5 – Módulo de pagos

**Fecha:** Febrero 2025  
**Referencia:** ROADMAP.md § Fase 5, flujoDePagos.md, flujoDePagosCasoFallaWebhook.md, flujoDePagosCondicionDeCarrera.md

---

## 1. Objetivo cumplido

Implementar pagos totales (efectivo, transferencia y online) con integridad, idempotencia y rescate ante fallo de webhook.

---

## 2. Alineación con ROADMAP

| Requisito ROADMAP | Implementado |
|-------------------|--------------|
| `POST /pagos` (EFECTIVO/TRANSFERENCIA) | ✓ |
| Backend calcula deuda; transacción serializable | ✓ |
| `POST /pagos/online/intencion` | ✓ |
| Crear link Wompi con monto exacto; guardar IntencionPago | ✓ |
| `POST /webhooks/wompi` | ✓ |
| Verificar firma; estado APPROVED; `registrarPagoDesdeProveedor` | ✓ |
| Endpoint de retorno (verificar) | ✓ |
| Consultar Wompi; si APPROVED, misma lógica de registro | ✓ |
| Idempotencia por `referenciaExterna` | ✓ |

---

## 3. Endpoints implementados

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | /api/pagos | TESORERA, ADMIN, SECRETARIA | Registrar pago efectivo o transferencia |
| POST | /api/pagos/online/intencion | ADMIN, SECRETARIA, TESORERA, AFILIADO | Crear intención de pago online (link Wompi) |
| GET | /api/pagos/online/verificar | ADMIN, SECRETARIA, TESORERA, AFILIADO | Verificar transacción y registrar si APPROVED |
| POST | /api/webhooks/wompi | — (sin JWT) | Webhook de Wompi; verificación por firma |

### POST /api/pagos

**Body:** `{ usuarioId, metodo: "EFECTIVO"|"TRANSFERENCIA", referenciaExterna? }`  
- `referenciaExterna` obligatoria para TRANSFERENCIA.

**Respuesta 201:** `{ data: { pagoId, monto, consecutivo }, meta }`

**Errores:** 422 DEUDA_CERO, 409 PAGO_DUPLICADO, 404 USUARIO_NO_ENCONTRADO

### POST /api/pagos/online/intencion

**Body:** `{ usuarioId }`  
- AFILIADO solo puede crear para usuarioId = su propio id.

**Respuesta 200:** `{ data: { checkoutUrl, referencia, monto, montoCents }, meta }`

### GET /api/pagos/online/verificar

**Query:** `transaction_id` (obligatorio)

**Respuesta 200:** `{ data: { registrado: true, pagoId, monto, consecutivo } | { registrado: false, status? }, meta }`

### POST /api/webhooks/wompi

Sin autenticación. Verifica firma SHA256 con `WOMPI_EVENTS_SECRET`.  
Responde siempre 200 para `transaction.updated` (evita reintentos innecesarios).

---

## 4. Modelo IntencionPago

```prisma
model IntencionPago {
  id             String   @id @default(uuid())
  usuarioId      String
  juntaId        String
  montoCents     Int
  wompiLinkId    String   @unique
  referencia     String
  iniciadoPorId  String
  fechaCreacion  DateTime @default(now())
  ...
}
```

- **wompiLinkId:** ID del payment link en Wompi.
- **referencia:** SKU interno (JAC-timestamp-random) para correlación.
- **iniciadoPorId:** Usuario que inició el pago (registradoPorId en el Pago final).

---

## 5. Flujo efectivo / transferencia

1. Tesorera/Admin/Secretaria llama `POST /api/pagos` con `{ usuarioId, metodo, referenciaExterna? }`.
2. Backend calcula deuda dentro de transacción serializable.
3. Si deuda > 0 y (metodo TRANSFERENCIA → referenciaExterna obligatoria): crea Pago, auditoría.
4. Respuesta: `{ pagoId, monto, consecutivo }`.

---

## 6. Flujo online (Wompi)

1. Usuario/Admin llama `POST /api/pagos/online/intencion` con `{ usuarioId }`.
2. Backend calcula deuda, crea payment link en Wompi, guarda IntencionPago.
3. Respuesta: `{ checkoutUrl, referencia, monto, montoCents }`.
4. Usuario paga en `https://checkout.wompi.co/l/{linkId}`.
5. **Webhook:** Wompi envía `POST /api/webhooks/wompi` con evento `transaction.updated`.
6. Backend verifica firma (SHA256 + WOMPI_EVENTS_SECRET), si status APPROVED llama `registrarPagoDesdeProveedor`.
7. **Retorno:** Usuario vuelve a la app; frontend llama `GET /api/pagos/online/verificar?transaction_id=xxx`.
8. Backend consulta Wompi; si APPROVED, llama misma lógica (rescate si webhook falló).

---

## 7. Seguridad

- Webhook: verificación de checksum con `WOMPI_EVENTS_SECRET`.
- Pagos: transacción serializable; idempotencia por `Pago.referenciaExterna` (unique).
- Multi-tenant: `juntaId` siempre desde JWT o desde IntencionPago; nunca desde body.

---

## 8. Variables de entorno

Ver `docs/WOMPI_VARIABLES_ENTORNO.md`:

- `WOMPI_ENVIRONMENT` (sandbox | production)
- `WOMPI_PRIVATE_KEY`
- `WOMPI_PUBLIC_KEY`
- `WOMPI_EVENTS_SECRET`
- `WOMPI_REDIRECT_URL`

---

## 9. Archivos creados y modificados

### Nuevos

| Archivo | Descripción |
|---------|-------------|
| `application/pagos/pagos.controller.ts` | Controller de pagos |
| `application/pagos/pagos.service.ts` | Lógica de pagos efectivo, transferencia y online |
| `application/pagos/pagos.module.ts` | Módulo de pagos |
| `application/pagos/dto/registrar-pago-efectivo.dto.ts` | DTO POST /pagos |
| `application/pagos/dto/crear-intencion-pago.dto.ts` | DTO POST intencion |
| `application/webhooks/webhooks.controller.ts` | Webhook Wompi |
| `application/webhooks/webhooks.module.ts` | Módulo webhooks |
| `infrastructure/wompi/wompi.service.ts` | Cliente HTTP API Wompi |
| `infrastructure/wompi/wompi.module.ts` | Módulo Wompi |
| `prisma/migrations/20250213190000_add_intencion_pago/migration.sql` | Migración IntencionPago |

### Modificados

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | Modelo IntencionPago, relaciones Junta/Usuario |
| `app.module.ts` | Import PagosModule, WebhooksModule |
| `infrastructure/audit/audit.module.ts` | Simplificado (providers directos) |
| `infrastructure/audit/prisma-audit-event-store.service.ts` | `@Inject(PrismaService)` en constructor |
| `infrastructure/debt/debt.module.ts` | Simplificado |
| `infrastructure/debt/prisma-debt-data-provider.service.ts` | `@Inject(PrismaService)` en constructor |
| `infrastructure/water/water.module.ts` | Simplificado |
| `infrastructure/water/prisma-water-repository.service.ts` | `@Inject(PrismaService)` en constructor |

---

## 10. Incidencias de integración y soluciones

### 10.1 Cliente Prisma desactualizado en Docker

**Problema:** Tras añadir `IntencionPago` al schema, el contenedor seguía con `node_modules` antiguo que no incluía `intencionPago` en `PrismaService`. Error: `Property 'intencionPago' does not exist on type 'PrismaService'`.

**Solución:** Reconstruir imagen (`docker compose build backend --no-cache`) y eliminar volúmenes (`docker compose down -v`) para que el contenedor use una copia nueva con el cliente Prisma regenerado.

**Mejora recomendada:** Añadir `npx prisma generate` al CMD del contenedor de desarrollo para regenerar en cada arranque.

### 10.2 Inyección de dependencias con tipos derivados

**Problema:** NestJS no resolvía `PrismaService` en clases que usaban `PrismaClientLike` (tipo `Pick<PrismaService, 'auditoria'>`). Error: `Nest can't resolve dependencies of the PrismaAuditEventStore (?)`.

**Solución:** Usar `@Inject(PrismaService)` en el constructor de cada clase que recibe Prisma:

```typescript
constructor(@Inject(PrismaService) private readonly prisma: PrismaClientLike) {}
```

Aplicado en: `PrismaAuditEventStore`, `PrismaDebtDataProvider`, `PrismaWaterRepository`

**Ventaja:** Módulos simplificados (providers directos en lugar de `useFactory`), más mantenible y escalable.

---

## 11. Migraciones

```bash
# Aplicar migraciones (desde raíz del proyecto)
docker compose run --rm backend npx prisma migrate deploy
```

Migración aplicada: `20250213190000_add_intencion_pago`

---

## 12. Checklist de verificación

- [x] POST /pagos efectivo y transferencia
- [x] POST /pagos/online/intencion
- [x] GET /pagos/online/verificar
- [x] POST /webhooks/wompi con verificación de firma
- [x] Modelo IntencionPago y migración
- [x] WompiService (crear link, consultar transacción)
- [x] Idempotencia por referenciaExterna
- [x] Transacción serializable en registro de pago
- [x] Auditoría en registro de pago
- [x] Multi-tenant (juntaId desde JWT o IntencionPago)
- [x] Respuestas según convencionesAPI (data, meta, códigos HTTP)

---

## 13. Pendiente (futuro)

- [ ] Job de reconciliación nocturno (transacciones APPROVED vs pagos).
- [ ] `POST /pagos` tipo CARTA (efectivo/online).
- [ ] Pruebas E2E: doble intención, webhook duplicado, fallo webhook + rescate.
- [ ] Configurar URL de webhook en dashboard Wompi (sandbox y producción).
- [ ] `prisma generate` en el CMD del contenedor de desarrollo (opcional).
