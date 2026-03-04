# Flujos de suscripciones, planes y facturación

**Fecha:** 2025-02-18  
**Referencia:** REGLAS_SUSCRIPCION_COMPLETAS, PIVOT_FACTURACION_SAAS, REVISION_EXHAUSTIVA_SUSCRIPCIONES_PLANES

---

## Resumen por caso

| Caso | ¿Cuándo se paga? | ¿Cuándo se crea/actualiza Suscripción? | Endpoint / Origen |
|------|------------------|----------------------------------------|-------------------|
| Crear con trial | Al terminar el trial | Al elegir plan (antes del pago) | POST /mi-junta/suscripcion |
| Crear sin trial | Al elegir plan | Después del pago (webhook/retorno) | POST /facturas-plataforma/intencion-suscripcion |
| Crear junta con plan | Al terminar trial (si hay) | Al crear junta | Platform: POST /platform/juntas |
| Upgrade | Al elegir nuevo plan | Después del pago | POST /facturas-plataforma/intencion-upgrade |
| Downgrade | No hay pago extra | Efectivo al fin del ciclo actual (o forzar admin) | PATCH /mi-junta/suscripcion |
| Cambio periodo (mensual→anual) | Al elegir (pago obligatorio) | Después del pago | POST /facturas-plataforma/intencion-upgrade (o similar) |
| Overrides (exceso de consumo) | Mensual, acumulables | Automático al superar límites | Cron + facturación mensual (ver MODELO_OVERRIDES_CONSUMO) |
| Renovación | Cuando vence (factura ya existe) | Al pagar | Cron + POST /facturas-plataforma/intencion |
| Pagar factura pendiente | Cuando el usuario paga | Según tipo de factura | POST /facturas-plataforma/intencion |

---

## 1. Crear suscripción CON días de prueba (trial)

**Origen:** Mi JAC (`/plan-suscripcion`) o Platform Admin (crear/editar junta).

### Flujo

```
1. Usuario elige plan con diasPrueba > 0 (ej. 14 días)
2. Frontend → POST /mi-junta/suscripcion { planId, diasPrueba, periodo }
   (o POST /platform/juntas/:id/suscripcion desde admin)
3. Backend:
   - Calcula fechaVencimiento = hoy + diasPrueba
   - Crea Suscripción (estado PRUEBA, periodo guardado)
   - Crea Factura (tipo SUSCRIPCION, PENDIENTE, fechaVencimiento = fin trial, monto según periodo)
4. Durante el trial: junta usa el plan sin pagar
5. Al terminar el trial:
   - Cron diario marca Suscripción → VENCIDA si fechaVencimiento < hoy
   - Junta ve factura pendiente en /facturas-plataforma
   - "Pagar ahora" → POST /facturas-plataforma/intencion { facturaId } → Wompi
6. Usuario paga en Wompi
7. Webhook o retorno → registrarPagoDesdeProveedorFactura
   - Factura tipo SUSCRIPCION + suscripcionId != null → conversión trial:
     - Suscripción.estado = ACTIVA
     - Suscripción.fechaVencimiento = hoy + periodo (1 mes o 1 año)
     - Suscripción.periodo = periodo
```

### Archivos

- Backend: `mi-junta.service.ts` (crearSuscripcion), `platform-juntas.service.ts`
- Backend: `platform-facturas.service.ts` (registrarPagoDesdeProveedorFactura, rama TRIAL_CONVERTIDO_ACTIVA)
- Frontend: `plan-suscripcion.component.ts` (abrirCrearSuscripcion, rama diasPrueba > 0)

---

## 2. Crear suscripción SIN días de prueba

**Origen:** Mi JAC (`/plan-suscripcion`).

### Flujo

```
1. Usuario elige plan con diasPrueba = 0 ("empezar a pagar ya")
2. Frontend → POST /facturas-plataforma/intencion-suscripcion { planId, periodo }
3. Backend (crearIntencionPagoSuscripcion):
   - Valida: no tiene suscripción ACTIVA/PRUEBA
   - Crea Factura (tipo SUSCRIPCION, suscripcionId = null, metadata: planId, periodo, juntaId)
   - Crea IntencionPagoFactura
   - Retorna checkoutUrl (Wompi)
4. Frontend redirige a Wompi
5. Usuario paga en Wompi
6. Wompi redirige a /facturas-plataforma/retorno?factura_id=X&transaction_id=Y
7. Frontend llama GET /facturas-plataforma/verificar?factura_id=X&transaction_id=Y
8. Backend (consultarYRegistrarPagoFactura → registrarPagoDesdeProveedorFactura):
   - Factura tipo SUSCRIPCION + suscripcionId == null → crear Suscripción:
     - planId, fechaInicio = hoy, fechaVencimiento = hoy + periodo
     - estado = ACTIVA, periodo
     - Asocia factura a suscripción
```

**Alternativa:** El webhook de Wompi puede llegar antes que el retorno; en ese caso el pago ya está registrado y verificar retorna `yaRegistrado: true`.

### Archivos

- Backend: `platform-facturas.service.ts` (crearIntencionPagoSuscripcion, registrarPagoDesdeProveedorFactura rama CREACION_SUSCRIPCION)
- Backend: `platform-facturas-public.controller.ts` (intencion-suscripcion, verificar)
- Frontend: `plan-suscripcion.component.ts` (abrirCrearSuscripcion, rama diasPrueba === 0)
- Frontend: `facturas-retorno.component.ts` (verificar pago tras retorno)

---

## 3. Crear junta con plan (Platform Admin)

**Origen:** POST /platform/juntas (crear junta nueva).

### Flujo

```
1. Admin crea junta con planId (y opcional diasPrueba)
2. JuntaService.createJunta:
   - Crea Junta, Usuario admin, Rol
   - Si planId: crea Suscripción (periodo = anual, fechaInicio, fechaVencimiento)
   - Si diasPrueba > 0: crea Factura PENDIENTE (tipo SUSCRIPCION, fechaVencimiento = fin trial)
3. Igual que flujo 1 para trial: al vencer, junta paga factura → Suscripción ACTIVA
```

### Archivos

- Backend: `junta.service.ts` (createJunta), `platform-juntas.service.ts` (crear)

---

## 4. Upgrade (cambio a plan superior)

**Origen:** Mi JAC (`/plan-suscripcion` → Cambiar plan).

### Flujo

```
1. Usuario elige plan con precioMensual > plan actual
2. Frontend abre ConfirmarCambioPlanDialog (esUpgrade = true)
3. Usuario confirma → POST /facturas-plataforma/intencion-upgrade { suscripcionId, planId, periodo }
4. Backend (crearIntencionPagoUpgrade):
   - Valida: plan nuevo > plan actual en precio
   - Crea Factura (tipo UPGRADE, suscripcionId, metadata: planId, periodo)
   - Crea IntencionPagoFactura
   - Retorna checkoutUrl
5. Usuario paga en Wompi → webhook/retorno
6. registrarPagoDesdeProveedorFactura:
   - Factura tipo UPGRADE → actualiza Suscripción:
     - planId, fechaVencimiento = hoy + periodo, periodo
     - Limpia overrides (overrideLimite* = null, esPlanPersonalizado = false)
```

### Archivos

- Backend: `platform-facturas.service.ts` (crearIntencionPagoUpgrade, rama UPGRADE_APLICADO)
- Frontend: `plan-suscripcion.component.ts` (abrirCambiarPlan, rama esUpgrade)

---

## 5. Downgrade (cambio a plan inferior)

**Origen:** Mi JAC (`/plan-suscripcion` → Cambiar plan) o Platform Admin.

**Regla:** El downgrade se puede solicitar **cualquier día**. Solo se hace efectivo al final del ciclo actual (cuando vence la vigencia). Excepción: Platform admin puede forzar el cambio inmediato con `forzarDowngrade`.

### Flujo

```
1. Usuario elige plan con precioMensual < plan actual
2. Se puede solicitar cualquier día (no hay restricción de "día 1")
3. PATCH /mi-junta/suscripcion { planId, periodo } (o desde platform)
4. Backend (actualizarSuscripcion):
   - LimitesService.validarCambioPlan → valida uso ≤ límites del plan destino
   - Registra el plan destino; el cambio es efectivo cuando fechaVencimiento < hoy
     (o inmediato si forzarDowngrade desde Platform)
   - Mantiene fechaVencimiento hasta fin de ciclo
   - Limpia overrides
5. No hay pago: el downgrade es efectivo al final del ciclo actual
```

> **Nota:** La implementación actual puede usar "plan pendiente" o "planId destino" hasta que venza el ciclo. O el admin fuerza con forzarDowngrade.

---

## 6. Cambio de periodo (mensual → anual, mismo plan)

**Origen:** Mi JAC (`/plan-suscripcion` → Cambiar plan). Solo se permite **upgrade de periodo** (mensual → anual).

**Reglas:**
- Solo mensual → anual (no anual → mensual en mismo tier).
- **Pago obligatorio** al momento para activar.
- **Sin días de trial** en este cambio, aunque el plan los permita.

### Flujo

```
1. Usuario tiene plan X mensual y elige plan X anual (mismo plan, periodo superior)
2. Frontend → POST /facturas-plataforma/intencion-upgrade (o endpoint específico cambio-periodo)
   - planId = mismo, periodo = anual
3. Backend crea Factura + IntenciónPago (monto = diferencia o precio anual según regla)
4. Usuario paga en Wompi → webhook/retorno
5. Al confirmar pago:
   - Suscripción.periodo = anual
   - Suscripción.fechaVencimiento = hoy + 1 año (o desde fecha actual según regla)
   - Sin aplicar diasPrueba
```

---

## 7. Overrides (exceso de consumo – facturación automática)

**Modelo:** Los overrides **no se solicitan**. Son automáticos cuando la junta supera los límites del plan. Planes con `esPersonalizable` definen precios por unidad adicional (carta, MB, usuario).

**Ver documento completo:** `MODELO_OVERRIDES_CONSUMO.md`

### Resumen del flujo

```
1. Plan tiene límites (usuarios, storage MB, cartas/mes) y precios por demanda
2. Usuario al elegir plan ve: límites + precios por exceso
3. Si la junta supera límites → se calcula exceso × precio por unidad
4. Facturación de overrides: MENSUAL (incluso para planes anuales)
   - Evita factura grande al final del año
   - Usuario puede acumular facturas y pagar cuando quiera
5. Por dimensión:
   - Cartas: mensual, se reinicia cada mes (exceso del mes × precio)
   - Usuarios: mensual, se recalcula (exceso actual × precio; puede variar si agregan/borran)
   - Storage MB: mensual, se recalcula
6. UI: informar al usuario que está sobre límites, cuánto gasta en overrides, recomendar upgrade
```

### Implementación actual vs. modelo deseado

| Aspecto | Estado actual | Modelo deseado |
|---------|---------------|----------------|
| Solicitar overrides | Usuario solicita, paga, se aplican | Automático al superar límites |
| Facturación | Al solicitar (pago único) | Mensual, acumulable |
| Planes anuales | Overrides al solicitar | Overrides facturados mensualmente |

---

## 8. Renovación (al vencer el periodo)

**Origen:** Cron **diario** a medianoche + pago por junta.

### Reglas de fechas

- **Pago anticipado:** Si paga antes de vencer, no se pierden días. La nueva vigencia empieza desde la fecha de vencimiento actual (no desde hoy).
- **Pago tardío:** Si paga después de vencer, la nueva vigencia empieza desde la fecha de vencimiento pasada (no desde hoy), para no quitar días.
- **Las fechas solo cambian** cuando: se cambia de plan, se cambia periodo de facturación, o se renueva.

### Flujo

```
1. Cron (diario, 00:00): generarFacturasRenovacion
   - Busca suscripciones ACTIVA/PRUEBA con fechaVencimiento <= hoy + 7 días
   - Que NO tengan factura RENOVACION en estado PENDIENTE/VENCIDA/PARCIAL
   - Crea Factura (tipo RENOVACION, monto según periodo)
   - fechaVencimiento factura = suscripcion.fechaVencimiento + margen (ej. 7 días)
2. Junta ve factura en /facturas-plataforma
3. "Pagar ahora" → POST /facturas-plataforma/intencion { facturaId } → Wompi
4. Usuario paga → webhook/retorno
5. registrarPagoDesdeProveedorFactura:
   - Factura tipo RENOVACION → actualiza Suscripción:
     - estado = ACTIVA
     - fechaVencimiento = max(suscripcion.fechaVencimiento, hoy) + periodo
       (no quitar días si paga antes; no cambiar si paga después)
     - periodo
```

### Archivos

- Backend: `platform-facturas.service.ts` (generarFacturasRenovacion, rama RENOVACION_APLICADA)
- Backend: `facturas-cron.service.ts` – Cron debe ejecutarse **diario** (no solo día 1)

---

## 9. Pagar factura existente (genérico)

**Origen:** Cualquier factura PENDIENTE/VENCIDA/PARCIAL (trial, renovación, manual).

### Flujo

```
1. Junta va a /facturas-plataforma
2. Ve facturas pendientes
3. "Pagar ahora" → POST /facturas-plataforma/intencion { facturaId }
4. Backend crea IntencionPagoFactura, retorna checkoutUrl
5. Usuario paga en Wompi
6. Webhook o retorno → registrarPagoDesdeProveedorFactura
7. Según factura.tipo y factura.suscripcionId:
   - SUSCRIPCION + null → crear Suscripción (flujo 2)
   - SUSCRIPCION + !null → trial → ACTIVA (flujo 1)
   - OVERRIDE → aplicar overrides (flujo 7)
   - UPGRADE → actualizar plan (flujo 4)
   - RENOVACION → extender fechaVencimiento (flujo 8)
   - Otros → solo registrar pago, actualizar estado factura
```

---

## 10. Cron jobs

| Cron | Horario | Función |
|------|---------|---------|
| generarFacturasRenovacion | **Diario** 00:00 | Suscripciones con fechaVencimiento ≤ hoy+7 días, sin factura RENOVACION pendiente |
| handleMarcarVencidas | Diario 00:00 (o 00:01) | marcarFacturasVencidas() (PENDIENTE → VENCIDA) |
| handleMarcarSuscripcionesVencidas | Diario 00:05 | marcarSuscripcionesVencidas() (ACTIVA/PRUEBA → VENCIDA si fechaVencimiento < hoy) |

> **Importante:** La renovación no depende del día 1 del mes. El cron corre **todos los días** y genera facturas para suscripciones que vencen en los próximos 7 días.

---

## 11. Diagrama de decisión: ¿qué hace el backend al registrar un pago?

```
registrarPagoDesdeProveedorFactura(factura)
  │
  ├─ factura.tipo == SUSCRIPCION && suscripcionId == null
  │    → Crear Suscripción (pago al suscribirse sin trial)
  │
  ├─ factura.tipo == SUSCRIPCION && suscripcionId != null
  │    → Trial convertido: Suscripción.estado = ACTIVA, nueva fechaVencimiento
  │
  ├─ factura.tipo == OVERRIDE && suscripcionId
  │    → (Modelo actual: aplicar overrideLimite*. Modelo deseado: facturación automática mensual)
  │
  ├─ factura.tipo == UPGRADE && suscripcionId
  │    → Actualizar planId, fechaVencimiento, limpiar overrides
  │
  └─ factura.tipo == RENOVACION && suscripcionId
       → Extender fechaVencimiento, estado = ACTIVA
```

---

## Referencias

- `MODELO_OVERRIDES_CONSUMO.md` – Overrides automáticos, facturación mensual
- `REGLAS_SUSCRIPCION_COMPLETAS.md` – Variables, fechas, upgrade/downgrade
- `REGLAS_UPGRADE_DOWNGRADE_PLAN.md` – Downgrade efectivo al fin de ciclo
- `PIVOT_FACTURACION_SAAS.md` – Modelo SaaS, pago al momento
- `REVISION_EXHAUSTIVA_SUSCRIPCIONES_PLANES.md` – Hallazgos y correcciones
