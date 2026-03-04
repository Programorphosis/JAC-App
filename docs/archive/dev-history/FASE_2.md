# Fase 2 – Domain Layer (completa)

**Fecha:** Febrero 2025  
**Referencia:** ROADMAP.md, definicionDomainServices.md

---

## 1. Objetivo cumplido

Servicios de dominio puros, determinísticos y auditables. Sin dependencias de Nest, HTTP ni Prisma directo en la capa de dominio.

---

## 2. Servicios implementados

### 2.1 DebtService

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Calcular deuda JUNTA bajo demanda. Nunca guarda. |
| **Método** | `calculateUserDebt({ usuarioId, juntaId, fechaCorte? }): Promise<DebtResult>` |
| **Puerto** | `IDebtDataProvider` – usuario, último pago, historial laboral por mes, tarifa vigente |
| **Implementación** | `PrismaDebtDataProvider` (acepta PrismaService o tx) |
| **Errores** | `UsuarioNoEncontradoError`, `SinHistorialLaboralError`, `SinTarifaVigenteError`, `HistorialLaboralSuperpuestoError` |
| **Algoritmo** | calculadoraDeDeuda.md – último pago → meses vencidos → estado laboral por mes → tarifa vigente |

### 2.2 AuditService

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Registrar eventos en tabla Auditoria |
| **Método** | `registerEvent(params): Promise<void>` |
| **Puerto** | `IAuditEventStore` |
| **Implementación** | `PrismaAuditEventStore` (acepta PrismaService o tx) |

### 2.3 PaymentService

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Registrar pago JUNTA validando monto = deuda calculada |
| **Método** | `registerJuntaPayment(params, ctx): Promise<RegisterJuntaPaymentResult>` |
| **Contexto** | `IPaymentRegistrationContext` – calculateDebt, createJuntaPayment, registerAudit, findPagoByReferenciaExterna, getNextConsecutivoPagoJunta |
| **Runner** | `PaymentRegistrationRunner.registerJuntaPayment()` – transacción **Serializable** |
| **Idempotencia** | `referenciaExterna` @unique para pagos online |
| **Errores** | `DeudaCeroError`, `PagoDuplicadoError` |
| **Regla** | Nunca recibe monto desde fuera; monto = deuda.total |

### 2.4 WaterService

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Único servicio que modifica EstadoAgua e HistorialAgua |
| **Métodos** | `updateWaterStatus`, `updateWaterObligation`, `applyMonthlyWaterCutoff` |
| **Puerto** | `IWaterRepository` |
| **Implementación** | `PrismaWaterRepository` |
| **Runner** | `WaterOperationRunner` – ejecuta en transacción (flujoReceptorDeAgua) |
| **Errores** | `UsuarioNoEncontradoError`, `EstadoAguaMismoEstadoError`, `EstadoAguaMismaObligacionError` |
| **Validaciones** | Rechaza si estado/obligación ya es el mismo |

### 2.5 LetterService

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Validar requisitos y emitir carta laboral |
| **Método** | `emitLetter(params, ctx): Promise<EmitLetterResult>` |
| **Contexto** | `ILetterEmissionContext` – validaciones, consecutivo, qrToken, updateCartaAprobada |
| **Runner** | `LetterEmissionRunner.emitLetter()` – transacción |
| **Validaciones** | deuda=0, pago CARTA existe, carta PENDIENTE, agua (si obligación activa → AL_DIA) |
| **Errores** | `RequisitosCartaNoCumplidosError`, `CartaNoPendienteError` |
| **QR** | `qrToken` UUID generado al aprobar |
| **PDF** | `generateCartaPdf` opcional – no implementado en MVP (retorna null) |

---

## 3. Estructura de archivos

```
domain/
├── ports/
│   ├── audit-event-store.port.ts
│   ├── debt-data-provider.port.ts
│   ├── payment-registration-context.port.ts
│   ├── water-repository.port.ts
│   ├── letter-emission-context.port.ts
│   └── pdf-generator.port.ts          # Para futuro
├── services/
│   ├── audit.service.ts
│   ├── debt.service.ts
│   ├── payment.service.ts
│   ├── water.service.ts
│   └── letter.service.ts
├── types/
└── errors/

infrastructure/
├── audit/
├── debt/
├── payment/
│   ├── prisma-payment-registration-context.service.ts
│   └── payment-registration-runner.service.ts
├── water/
│   ├── prisma-water-repository.service.ts
│   └── water-operation-runner.service.ts
└── letter/
    ├── prisma-letter-emission-context.service.ts
    └── letter-emission-runner.service.ts
```

---

## 4. Uso desde Application Layer

| Operación | Servicio/Runner a usar |
|-----------|------------------------|
| Calcular deuda | `DebtService.calculateUserDebt()` |
| Registrar pago JUNTA | `PaymentRegistrationRunner.registerJuntaPayment()` |
| Cambiar estado agua | `WaterOperationRunner.updateWaterStatus()` |
| Cambiar obligación agua | `WaterOperationRunner.updateWaterObligation()` |
| Corte mensual día 1 | `WaterOperationRunner.applyMonthlyWaterCutoff()` |
| Emitir carta | `LetterEmissionRunner.emitLetter()` |
| Auditoría | `AuditService.registerEvent()` |

---

## 5. Correcciones aplicadas en revisión

1. **WaterService – Transacción:** Operaciones de agua ejecutadas en transacción vía `WaterOperationRunner` (flujoReceptorDeAgua).
2. **WaterService – Validación mismo estado:** Rechaza si `nuevoEstado === actual.estado` o `obligacionActiva` no cambia.
3. **PrismaWaterRepository / PrismaAuditEventStore:** Aceptan cliente de transacción para uso dentro de `$transaction`.
4. **PrismaLetterEmissionContext.generateCartaPdf:** Firma alineada con el interface.
5. **Código no utilizado:** Eliminado `letter-repository.port.ts`.

---

## 6. Deuda técnica conocida

| Item | Descripción |
|------|-------------|
| PDF de cartas | `generateCartaPdf` retorna null. Implementar en Fase 7 con generación real y S3. |
| Usuario sistema | `applyMonthlyWaterCutoff` requiere `ejecutadoPorId` para auditoría. El cron debe pasar un usuario "sistema" o admin. |

---

## 7. Criterio de cierre (ROADMAP)

> Tests o validación manual de cada Domain Service según especificación; sin dependencias HTTP.

- [x] DebtService – algoritmo según calculadoraDeDeuda
- [x] AuditService – registro en Auditoria
- [x] PaymentService – transacción serializable, idempotencia
- [x] WaterService – transacción, historial, corte mensual
- [x] LetterService – validaciones, transacción, qrToken

**Fase 2 cerrada.**
