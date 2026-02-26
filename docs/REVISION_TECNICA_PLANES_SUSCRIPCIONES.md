# Revisión técnica – Planes y suscripciones

**Fecha:** 2025-02-17  
**Objetivo:** Evaluar solidez del módulo y detectar pendientes para continuar desarrollo.

---

## 1. Resumen ejecutivo

| Área | Estado | Observaciones |
|------|--------|---------------|
| Modelo de datos | ✅ Sólido | Plan y Suscripcion completos; precios por demanda |
| Backend – creación/actualización | ✅ Sólido | Utilidad centralizada, periodo mensual/anual, diasPrueba |
| Backend – límites y validación | ✅ Sólido | LimitesService, upgrade/downgrade, día de corte |
| Backend – facturación | ⚠️ Parcial | Genera facturas mensuales; no distingue periodo anual |
| Frontend – Mi JAC | ✅ Sólido | Plan selector, confirmación, periodo por card |
| Frontend – Platform Admin | ⚠️ Parcial | Falta UI para forzarDowngrade |
| Documentación | ✅ Buena | REGLAS_SUSCRIPCION_COMPLETAS, REGLAS_UPGRADE_DOWNGRADE |
| Cron jobs | ✅ OK | Facturas día 1, suscripciones vencidas diario |

---

## 2. Arquitectura actual

### 2.1 Modelo de datos (Prisma)

**Plan**
- `precioMensual`, `precioAnual` (COP)
- `limiteUsuarios`, `limiteStorageMb`, `limiteCartasMes` (null = sin límite numérico)
- `permiteUsuariosIlimitados`, `permiteStorageIlimitado`, `permiteCartasIlimitadas`
- `esPersonalizable`, `diasPrueba`
- `precioPorUsuarioAdicional`, `precioPorMbAdicional`, `precioPorCartaAdicional` (planes personalizables)

**Suscripcion**
- `planId`, `fechaInicio`, `fechaVencimiento`, `estado` (ACTIVA, PRUEBA, VENCIDA, SUSPENDIDA, CANCELADA)
- `overrideLimiteUsuarios`, `overrideLimiteStorageMb`, `overrideLimiteCartasMes`
- `esPlanPersonalizado`, `precioPersonalizado`, `motivoPersonalizacion`

**No existe:** campo `periodo` (mensual/anual) en Suscripcion. Se usa solo para calcular `fechaVencimiento` al crear/actualizar.

### 2.2 Utilidad centralizada

**Archivo:** `apps/backend/src/common/utils/suscripcion-fechas.util.ts`

- `calcularFechaVencimiento({ fechaInicio, diasPrueba?, periodo? })`
- `getEstadoSuscripcion(diasPrueba)`
- `DIA_DE_CORTE = 1`

**Usada en:** mi-junta.service, platform-juntas.service, junta.service (crear junta).

### 2.3 Flujos backend

| Operación | Endpoint | Servicio | Variables |
|-----------|----------|----------|-----------|
| Crear suscripción (Mi JAC) | POST /mi-junta/suscripcion | mi-junta.service | planId, diasPrueba?, periodo? |
| Crear suscripción (Platform) | POST /platform/juntas/:id/suscripcion | platform-juntas.service | planId, diasPrueba?, periodo? |
| Actualizar suscripción (Mi JAC) | PATCH /mi-junta/suscripcion | mi-junta.service | planId?, periodo?, overrides? |
| Actualizar suscripción (Platform) | PATCH /platform/juntas/:id/suscripcion | platform-juntas.service | planId?, periodo?, fechaVencimiento?, forzarDowngrade?, overrides? |

### 2.4 Validación de cambio de plan

**Archivo:** `limites.service.ts` → `validarCambioPlan()`

- **Upgrade:** permitido siempre; nueva fecha según periodo.
- **Downgrade:** solo día 1; valida uso ≤ límites del plan destino; `forzarDowngrade` omite día de corte.
- **Mismo tier:** fecha se actualiza si se envía `periodo`.

---

## 3. Frontend – componentes

### 3.1 Mi JAC (tesorera gestiona plan)

| Componente | Ruta | Función |
|------------|------|---------|
| PlanSuscripcionComponent | /plan-suscripcion | Crear/cambiar plan, solicitar overrides |
| PlanSelectorDialogComponent | (dialog) | Tarjetas con periodo + diasPrueba por plan |
| PlanDetailModalComponent | (dialog) | Detalle del plan |
| ConfirmarCambioPlanDialogComponent | (dialog) | Reglas upgrade/downgrade |

**Permiso:** `JUNTA_SUSCRIPCION_GESTIONAR` (TESORERA de junta).

### 3.2 Platform Admin

| Componente | Ruta | Función |
|------------|------|---------|
| PlanesListComponent | /platform/planes | CRUD planes |
| PlanFormDialogComponent | (dialog) | Crear/editar plan |
| JuntaDetailComponent | /platform/juntas/:id | Crear/cambiar suscripción, overrides |
| JuntaSuscripcionCardComponent | (card) | Resumen suscripción |
| JuntaFacturacionCardComponent | (card) | Facturas, pagos, cambiar plan |
| SolicitarOverridesDialogComponent | (dialog) | Overrides (desde platform para junta) |

---

## 4. Cron jobs

| Cron | Horario | Función |
|------|---------|---------|
| handleFacturasMensuales | Día 1, 00:00 | Genera facturas MENSUAL para suscripciones ACTIVA/PRUEBA |
| handleMarcarFacturasVencidas | Día 2, 00:00 | PENDIENTE → VENCIDA si pasó fecha |
| handleMarcarSuscripcionesVencidas | Diario 00:05 | ACTIVA/PRUEBA → VENCIDA si fechaVencimiento < hoy |

---

## 5. Gaps y pendientes

### 5.1 Facturación y periodo (mensual vs anual)

**Situación:** El cron genera facturas MENSUAL cada mes con `plan.precioMensual`. No hay distinción entre suscripciones mensuales y anuales.

**Pendiente:**
- [ ] Definir si suscripciones anuales se facturan: (a) mensualmente (precioAnual/12), (b) una vez al año, o (c) igual que mensual por ahora.
- [ ] Si se factura distinto: guardar `periodo` en Suscripcion o derivarlo de `fechaVencimiento` (ej. vence en >6 meses → anual).
- [ ] Ajustar `generarFacturasMensuales` según la regla elegida.

### 5.2 Precios por demanda (exceso de uso)

**Situación:** Plan tiene `precioPorUsuarioAdicional`, `precioPorMbAdicional`, `precioPorCartaAdicional`. No hay lógica que calcule ni facture el exceso.

**Pendiente:**
- [ ] Definir cuándo se cobra por demanda (al generar factura, al superar límite, etc.).
- [ ] Implementar cálculo de exceso (usuarios, MB, cartas) vs límites efectivos.
- [ ] Incluir monto por demanda en la factura o en factura aparte.

### 5.3 forzarDowngrade – UI Platform Admin

**Situación:** El backend acepta `forzarDowngrade: true` en PATCH suscripción. No hay control en el frontend.

**Pendiente:**
- [ ] Añadir checkbox "Forzar downgrade (omitir día de corte)" en el flujo de cambiar plan (platform admin).
- [ ] Mostrar advertencia clara de que es excepcional.

### 5.4 Renovación / conversión de prueba

**Situación:** Al vencer la prueba (PRUEBA → VENCIDA), la junta debe crear suscripción de nuevo o el admin debe actuar. No hay flujo de "renovar" o "convertir prueba a pago".

**Pendiente:**
- [ ] Definir si existe flujo de renovación explícita.
- [ ] Considerar botón "Renovar" o "Continuar después de prueba" que abra el selector de plan con periodo.

### 5.5 precioPersonalizado en facturación

**Situación:** Suscripcion tiene `precioPersonalizado`. La factura usa `susc.precioPersonalizado ?? plan.precioMensual`. No está claro cuándo se asigna `precioPersonalizado`.

**Pendiente:**
- [ ] Documentar cuándo se setea `precioPersonalizado` (overrides con cobro, planes personalizables).
- [ ] Revisar si el flujo de solicitar overrides actualiza `precioPersonalizado`.

### 5.6 Documentación desactualizada

**REGLAS_UPGRADE_DOWNGRADE_PLAN.md** indica "Nueva fecha = día de activación + 1 año" en el resumen. Hoy la fecha depende de `periodo` (mensual o anual).

**Pendiente:**
- [ ] Actualizar tabla resumen en REGLAS_UPGRADE_DOWNGRADE_PLAN.md con periodo mensual/anual.

---

## 6. Checklist de solidez

### Backend
- [x] Crear suscripción con diasPrueba y periodo
- [x] Actualizar suscripción (cambio plan) con periodo
- [x] Upgrade: nueva fecha según periodo
- [x] Downgrade: solo día 1, validación de uso
- [x] Mismo tier: actualizar fecha si periodo enviado
- [x] forzarDowngrade en platform
- [x] Overrides en planes personalizables
- [x] LimitesService con overrides e ilimitados
- [x] Cron marcar suscripciones vencidas
- [ ] Facturación diferenciada mensual/anual (pendiente)
- [ ] Precios por demanda en factura (pendiente)

### Frontend
- [x] Selector de plan con periodo por card
- [x] Selector de diasPrueba (checkbox cuando plan tiene trial)
- [x] Diálogo de confirmación con reglas upgrade/downgrade
- [x] Bloqueo de downgrade fuera del día 1 (mensaje claro)
- [x] Crear suscripción (Mi JAC y Platform)
- [x] Cambiar plan (Mi JAC y Platform)
- [x] Solicitar overrides
- [ ] forzarDowngrade en UI Platform (pendiente)

### Documentación
- [x] REGLAS_SUSCRIPCION_COMPLETAS.md
- [x] REGLAS_UPGRADE_DOWNGRADE_PLAN.md
- [x] Motor de Límites, ROADMAP_PA5_LIMITES
- [ ] Actualizar resumen upgrade con periodo

---

## 7. Orden sugerido para mañana

1. **Leer PIVOT_FACTURACION_SAAS.md** – Documento que describe el giro necesario: pago al suscribirse, overrides al solicitarlos, trial con deuda diferida.
2. **Actualizar REGLAS_UPGRADE_DOWNGRADE_PLAN.md** – Incluir periodo en el resumen.
3. **UI forzarDowngrade** – Checkbox en platform al cambiar plan (rápido).
4. **Pivot facturación** – Seguir fases en PIVOT_FACTURACION_SAAS.md.

---

## 8. Flujos detallados

Ver **`FLUJOS_SUSCRIPCIONES_PLANES.md`** para el recorrido paso a paso de cada caso.

---

## 9. Referencias de código

| Concepto | Archivo |
|----------|---------|
| Cálculo fechas | `common/utils/suscripcion-fechas.util.ts` |
| Validación cambio plan | `infrastructure/limits/limites.service.ts` |
| Crear/actualizar Mi JAC | `application/mi-junta/mi-junta.service.ts` |
| Crear/actualizar Platform | `platform/juntas/platform-juntas.service.ts` |
| Generar facturas | `platform/facturas/platform-facturas.service.ts` |
| Cron facturas/suscripciones | `platform/facturas/facturas-cron.service.ts` |
| Selector plan | `platform/plan-selector-dialog/plan-selector-dialog.component.ts` |
| Confirmar cambio | `shared/dialogs/confirmar-cambio-plan-dialog/` |
