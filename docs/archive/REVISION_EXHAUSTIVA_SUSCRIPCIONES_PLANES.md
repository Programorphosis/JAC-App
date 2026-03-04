# Revisión exhaustiva: Suscripciones, Planes y Facturación SaaS

**Fecha:** 2025-02-18  
**Objetivo:** Garantizar arquitectura robusta, lógica matemática correcta y modelo de negocio defendible.

---

## 1. Resumen ejecutivo

| Área | Estado | Acción |
|------|--------|--------|
| **Cálculo de fechas** | ⚠️ Edge cases | Robustecer `calcularFechaVencimiento` (31→28 feb) |
| **Cálculo overrides** | ❌ Error matemático | Cobrar delta (incremento), no total |
| **JuntaService.createJunta** | ❌ Inconsistente | Falta periodo, factura en trial |
| **LimitesService.validarCambioPlan** | ⚠️ Inconsistente | Retorna siempre anual en upgrade; callers ignoran |
| **Arquitectura** | ✅ Sólida | Separación clara, utilidad centralizada |
| **Flujos SaaS** | ✅ Alineados | PIVOT implementado (intenciones, trial, upgrade) |

---

## 2. Arquitectura actual (validada)

### 2.1 Fuente única de verdad para fechas

```
apps/backend/src/common/utils/suscripcion-fechas.util.ts
├── calcularFechaVencimiento({ fechaInicio, diasPrueba?, periodo? })
├── getEstadoSuscripcion(diasPrueba)
└── DIA_DE_CORTE = 1
```

**Usado por:** mi-junta.service, platform-juntas.service, junta.service, platform-facturas.service

### 2.2 Flujos de negocio

| Flujo | Entrada | Salida | Documento |
|-------|---------|--------|-----------|
| Crear suscripción con trial | planId, diasPrueba, periodo | Suscripción PRUEBA + Factura PENDIENTE | REGLAS_SUSCRIPCION_COMPLETAS |
| Crear suscripción sin trial | planId, periodo | Factura + Intención → pago → Suscripción | PIVOT_FACTURACION_SAAS |
| Upgrade | planId, periodo | Factura + Intención → pago → actualizar Suscripción | REGLAS_UPGRADE_DOWNGRADE |
| Overrides | overrideLimite* | Factura + Intención → pago → aplicar overrides | PIVOT_FACTURACION_SAAS |
| Renovación | Cron día 1 | Factura RENOVACION para vencimientos próximos | PIVOT_FACTURACION_SAAS |

### 2.3 Cron jobs

| Cron | Horario | Función |
|------|---------|---------|
| handleFacturasMensuales | Día 1, 00:00 | generarFacturasRenovacion() |
| handleMarcarVencidas | Día 2, 00:00 | marcarFacturasVencidas() |
| handleMarcarSuscripcionesVencidas | Diario 00:05 | marcarSuscripcionesVencidas() |

---

## 3. Hallazgos críticos (corregir)

### 3.1 ❌ Cálculo de monto overrides – ERROR MATEMÁTICO

**Ubicación:** `platform-facturas.service.ts` → `calcularMontoOverrides()`

**Problema:** Se cobra `overrideLimiteUsuarios * precioPorUsuarioAdicional` (total).  
**Correcto:** Cobrar `(overrideLimiteUsuarios - limiteBase) * precioPorUsuarioAdicional` (delta).

**Ejemplo:** Plan base 10 usuarios, override 15, precio 5.000 COP/usuario adicional.
- Actual: 15 × 5.000 = 75.000 COP (incorrecto)
- Correcto: (15 − 10) × 5.000 = 25.000 COP

**Corrección:** Calcular límite efectivo actual (override ?? plan) y cobrar solo el incremento.

---

### 3.2 ❌ JuntaService.createJunta – Trial sin factura

**Ubicación:** `application/junta/junta.service.ts`

**Problemas:**
1. No crea `Factura` cuando `diasPrueba > 0`. La junta en trial no tiene factura para pagar al terminar.
2. No guarda `periodo` en Suscripcion (queda null).
3. No guarda `fechaInicio` explícitamente (usa default, OK).

**Corrección:** Alinear con mi-junta.service y platform-juntas.service: crear factura PENDIENTE cuando dias > 0, guardar periodo.

---

### 3.3 ⚠️ LimitesService.validarCambioPlan – Upgrade siempre anual

**Ubicación:** `infrastructure/limits/limites.service.ts`

**Problema:** En upgrade retorna `nuevaFechaVencimiento = hoy + 1 año` sin considerar `periodo`.  
**Impacto:** Bajo – los callers (mi-junta, platform-juntas) ignoran ese valor y usan `calcularFechaVencimiento` con `data.periodo`.  
**Recomendación:** Añadir parámetro `periodo` a `validarCambioPlan` para consistencia y retornar fecha correcta.

---

### 3.4 ⚠️ Edge case: fechas en meses cortos

**Ubicación:** `suscripcion-fechas.util.ts`

**Problema:** `setMonth(base.getMonth() + 1)` en 31 de enero → 3 de marzo (JavaScript).  
**Recomendación:** Usar `setUTCDate(1)` y luego sumar meses, o librería date-fns/dayjs para evitar desbordes.

---

### 3.5 ~~50.000 COP mágico en overrides~~ ✅ Corregido

**Antes:** `return total > 0 ? total : 50_000` — monto mágico si no había nada que cobrar.  
**Ahora:** Si `total <= 0` se lanza `BadRequestException` con mensaje explícito. No se cobra nada sin incremento real ni precios configurados.

---

## 4. Pendientes de implementación (modelo de negocio actualizado)

| Item | Documento | Estado actual |
|------|-----------|---------------|
| **Downgrade** | REGLAS_UPGRADE_DOWNGRADE, FLUJOS §5 | Código restringe a día 1. Debe: permitir cualquier día, efectivo al fin de ciclo. |
| **Cambio periodo (mensual→anual)** | FLUJOS §6 | Actualmente sin pago. Debe: pago obligatorio, sin trial. |
| **Overrides** | MODELO_OVERRIDES_CONSUMO | Actual: solicitud manual + pago único. Deseado: automático, facturación mensual. |
| **Cron renovación** | FLUJOS §8 | Actual: día 1. Debe: diario a medianoche. |

## 5. Inconsistencias menores

| Item | Estado | Acción |
|------|--------|--------|
| forzarDowngrade en UI | No implementado | Añadir checkbox en platform admin |
| inferirPeriodo (180 días) | Heurística | Documentar; considerar guardar periodo siempre |

---

## 6. Checklist de solidez

### Backend
- [x] Utilidad centralizada de fechas
- [x] Crear suscripción con diasPrueba y periodo
- [x] Actualizar suscripción (upgrade/downgrade/mismo tier)
- [x] Downgrade: solo día 1, validación de uso
- [x] Overrides en planes personalizables
- [x] LimitesService con overrides e ilimitados
- [x] Cron marcar suscripciones vencidas
- [x] Facturación diferenciada mensual/anual (generarFacturasRenovacion)
- [x] Cálculo de overrides (delta) – corregido
- [x] JuntaService trial + factura + periodo – corregido

### Frontend
- [x] Selector de plan con periodo
- [x] Selector de diasPrueba
- [x] Diálogo de confirmación upgrade/downgrade
- [x] Bloqueo downgrade fuera del día 1
- [ ] forzarDowngrade en UI Platform (pendiente)

### Documentación
- [x] REGLAS_SUSCRIPCION_COMPLETAS.md
- [x] REGLAS_UPGRADE_DOWNGRADE_PLAN.md
- [x] PIVOT_FACTURACION_SAAS.md
- [x] REVISION_TECNICA_PLANES_SUSCRIPCIONES.md

---

## 7. Orden de corrección recomendado

### Ya aplicados
1. Cálculo overrides (delta).
2. JuntaService trial + factura + periodo.
3. validarCambioPlan con periodo.
4. Documentación de fechas.

### Pendientes (modelo de negocio actualizado)
1. **Downgrade** – Quitar restricción día 1; efectivo al fin de ciclo.
2. **Cron renovación** – Ejecutar diario (no solo día 1).
3. **Cambio periodo (mensual→anual)** – Flujo con pago, sin trial.
4. **Overrides** – Migrar a modelo automático (MODELO_OVERRIDES_CONSUMO).

---

## 8. Flujos detallados

Ver **`FLUJOS_SUSCRIPCIONES_PLANES.md`** para el recorrido paso a paso de cada caso (crear con/sin trial, upgrade, downgrade, overrides, renovación, cron jobs).

---

## Referencias de código

| Concepto | Archivo |
|----------|---------|
| Cálculo fechas | `common/utils/suscripcion-fechas.util.ts` |
| Validación cambio plan | `infrastructure/limits/limites.service.ts` |
| Crear/actualizar Mi JAC | `application/mi-junta/mi-junta.service.ts` |
| Crear/actualizar Platform | `platform/juntas/platform-juntas.service.ts` |
| Crear junta | `application/junta/junta.service.ts` |
| Facturación | `platform/facturas/platform-facturas.service.ts` |
| Cron | `platform/facturas/facturas-cron.service.ts` |
