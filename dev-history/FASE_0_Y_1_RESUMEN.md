# Resumen Fase 0 y Fase 1 – Sistema JAC

**Propósito:** Documento de referencia para continuar con Fase 2 (Domain Layer).  
**Fecha:** Febrero 2025

---

## 1. Fase 0 – Cimiento (cerrado)

Documentación y reglas formales. Todo el conocimiento del sistema está escrito y alineado.

### Entregables

| Documento | Contenido |
|-----------|-----------|
| `plan.md` | Plan integral, principios rectores, arquitectura en capas |
| `00_ARQUITECTURA_RECTOR copy.md` | Multi-tenant, juntaId en toda consulta, seguridad base |
| `SCHEMA BASE v1.md` | Modelo ER oficial |
| `calculadoraDeDeuda.md` | Algoritmo de cálculo de deuda (sin almacenar) |
| `flujoDePagos.md`, `flujoDePagosCasoFallaWebhook.md`, `flujoDePagosCondicionDeCarrera.md` | Pagos efectivo/online, webhook, idempotencia |
| `flujoReceptorDeAgua.md` | Estado agua, obligación, corte día 1 |
| `flujoSolicitudCarta.md`, `validacionesDeCartaQR.md` | Cartas laborales, requisitos, QR |
| `definicionDomainServices.md` | Contratos Debt, Payment, Letter, Water, Audit |
| `chatModeCursor.md` | Reglas de implementación |
| Otros | configuracionInfraestructura, convencionesAPI, consecutivosYCronJobs, etc. |

### Principios inmutables

- Toda consulta filtra por `juntaId`
- Deuda calculada bajo demanda; no almacenada
- Solo pagos totales (no parciales)
- Auditoría en acciones críticas
- Backend como única fuente de verdad

---

## 2. Fase 0.5 – Configuración Inicial (cerrado)

Monorepo, Docker, proyectos inicializados, bootstrap y platform admin.

### Estructura

```
JAC App/
├── apps/
│   ├── backend/     # NestJS + Prisma + PostgreSQL
│   └── frontend/    # Angular + Angular Material + Tailwind (antes: React + Vite)
├── docker/
│   └── scripts/     # init-db.sh
├── docs/            # Documentación
└── docker-compose.yml
```

### Backend

- **NestJS** en `apps/backend`
- **Prisma** con schema alineado a SCHEMA BASE v1
- **Migraciones:** `20250213000000_init`, `20250213180000_add_password_and_seed_roles`
- **Auth:** JWT con `userId`, `juntaId`, `roles`; estrategia passport-jwt
- **Guards:** `PlatformAdminGuard` para rutas `/api/platform/*`
- **Endpoints:**
  - `POST /api/bootstrap` – crea platform admin + primera junta (solo si no hay juntas)
  - `GET/POST/PATCH /api/platform/juntas`, `GET /api/platform/juntas/:id`
  - `POST /auth/login`
  - `GET /health`

### Base de datos

- PostgreSQL vía Docker
- Modelos: Junta, Usuario, UsuarioRol, Rol, HistorialLaboral, Tarifa, Pago, EstadoAgua, HistorialAgua, Carta, Documento, Consecutivo, Auditoria

---

## 3. Fase 1 – Modelo de datos y contratos (cerrado)

### 1.1 Schema Prisma

- Revisado vs `SCHEMA BASE v1.md`
- `Pago.referenciaExterna` String? @unique (idempotencia pagos online)
- Índices `@@index([juntaId])` en tablas multi-tenant
- `Usuario.passwordHash` requerido

### 1.2 Contratos de dominio

**Tipos** (`domain/types/`):

- `audit.types.ts` – `RegisterAuditEventParams`
- `debt.types.ts` – `DebtResult`, `DebtMonthDetail`, `CalculateUserDebtParams`
- `payment.types.ts` – parámetros PaymentService
- `letter.types.ts` – parámetros LetterService
- `water.types.ts` – parámetros WaterService

**Errores** (`domain/errors/`):

- `domain.errors.ts` – errores de dominio (no HttpException)

**Puertos** (`domain/ports/`):

- `IAuditEventStore` – `registerEvent(params)`

**Servicios** (`domain/services/`):

- `AuditService` – dominio puro; recibe `IAuditEventStore` por constructor; delega persistencia al puerto

**Infraestructura** (`infrastructure/audit/`):

- `PrismaAuditEventStore` – implementa `IAuditEventStore` con Prisma
- `AuditModule` – provee el store; wire en módulos que lo necesiten

---

## 4. Estado actual para Fase 2

### Listo

- Schema Prisma estable
- Tipos de dominio para los 5 servicios
- AuditService implementado (dominio + puerto + implementación Prisma)
- Estructura de capas: domain → application → infrastructure

### Fase 2 – Domain Layer (completa)

| Orden | Servicio | Estado |
|-------|----------|--------|
| 1 | **DebtService** | ✔ Hecho |
| 2 | **AuditService** | ✔ Hecho |
| 3 | **PaymentService** | ✔ Hecho |
| 4 | **WaterService** | ✔ Hecho |
| 5 | **LetterService** | ✔ Hecho |

### DebtService

- **Puerto:** `IDebtDataProvider` – lectura de usuario, último pago, historial laboral por mes, tarifa vigente
- **Implementación:** `PrismaDebtDataProvider` en `infrastructure/debt/`
- **Método:** `calculateUserDebt({ usuarioId, juntaId, fechaCorte? }): Promise<DebtResult>`

### PaymentService

- **Contexto:** `IPaymentRegistrationContext` – calculateDebt, createJuntaPayment, registerAudit, findPagoByReferenciaExterna, getNextConsecutivoPagoJunta
- **Runner:** `PaymentRegistrationRunner.registerJuntaPayment()` – transacción serializable
- **Idempotencia:** `referenciaExterna` @unique para pagos online

### WaterService

- **Puerto:** `IWaterRepository` – EstadoAgua, HistorialAgua
- **Métodos:** `updateWaterStatus`, `updateWaterObligation`, `applyMonthlyWaterCutoff`
- **Implementación:** `PrismaWaterRepository` en `infrastructure/water/`

### LetterService

- **Contexto:** `ILetterEmissionContext` – validaciones, consecutivo, qrToken, updateCartaAprobada
- **Runner:** `LetterEmissionRunner.emitLetter()` – transacción
- **Validaciones:** deuda=0, pago CARTA, agua (si obligación activa → AL_DIA)

### Reglas técnicas para Fase 2

- Dominio puro: sin Nest, sin HTTP, sin Prisma directo
- Usar puertos para persistencia/lectura
- Transacciones `Serializable` donde aplique (pagos)
- Recalcular deuda **dentro** de la transacción de pago
- Errores explícitos; no ignorar inconsistencias

### Documentos clave para Fase 2

- `definicionDomainServices.md` – contratos y flujos
- `calculadoraDeDeuda.md` – algoritmo DebtService
- `flujoDePagosCondicionDeCarrera.md` – PaymentService
- `flujoReceptorDeAgua.md` – WaterService
- `flujoSolicitudCarta.md`, `validacionesDeCartaQR.md` – LetterService

---

## 5. Documentación Fase 2

Ver **dev-history/FASE_2.md** para detalle completo de la Fase 2.

---

## 6. Documentación Fase 3

Ver **dev-history/FASE_3.md** para detalle completo.

---

## 7. Siguiente paso inmediato (Fase 4)

**Módulo deuda** – Exponer cálculo de deuda:

- `GET /api/usuarios/:id/deuda` → DebtService.calculateUserDebt
