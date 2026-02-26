# Pivot: Facturación al estilo SaaS real

**Fecha:** 2025-02-17  
**Objetivo:** Documentar el giro necesario en la facturación para que funcione como un SaaS real: pago al suscribirse, overrides al solicitarlos, y días de prueba con deuda diferida.

---

## 1. Qué estamos haciendo mal (actual)

### 1.1 Flujo actual

```
1. Junta elige plan → POST crear suscripción → Suscripción creada SIN PAGO
2. Cron día 1: genera facturas MENSUAL para todas las suscripciones activas
3. Junta ve facturas pendientes → "Pagar ahora" → Wompi → paga cuando quiere (o nunca)
```

**Problemas:**
- La junta se suscribe sin pagar. La deuda se genera después por cron.
- No hay urgencia: puede usar el plan meses sin pagar.
- No es cómo funciona un SaaS: en un SaaS pagas al elegir el plan.

### 1.2 Overrides actuales

```
1. Junta solicita overrides (más usuarios, storage, cartas)
2. Se actualizan overrideLimite* en Suscripción
3. El cron del día 1 genera factura con precioPersonalizado (si existe)
4. Junta paga cuando quiere
```

**Problema:** Los overrides se aprueban sin cobro inmediato. Deberían facturarse y cobrarse al momento de solicitarlos.

---

## 2. Cómo debe funcionar (SaaS real)

### 2.1 Suscripción SIN días de prueba

```
1. Junta elige plan
2. Pantalla de resumen: plan, periodicidad (mensual/anual), precio
3. "Pagar ahora" → crea factura + intención pago → Wompi
4. Usuario paga en Wompi
5. Webhook/retorno confirma pago → ENTONCES se crea la Suscripción
```

**Regla:** La suscripción solo existe después del pago. Sin pago = sin suscripción.

### 2.2 Suscripción CON días de prueba

```
1. Junta elige plan con trial (ej. 14 días)
2. Se crea Suscripción en estado PRUEBA (fechaVencimiento = hoy + 14 días)
3. Se crea Factura con estado PENDIENTE, fechaVencimiento = hoy + 14 días
   (la deuda existe pero no es exigible hasta que termine el trial)
4. Durante el trial: junta usa el plan sin pagar
5. Al terminar el trial (día 15):
   - Si no pagó: Suscripción → VENCIDA, Factura sigue PENDIENTE
   - La junta SOLO puede pagar esa factura (no puede cambiar de plan sin pagar)
   - "Pagar ahora" → Wompi → al confirmar pago → Suscripción ACTIVA, fechaVencimiento = hoy + periodo
```

**Regla:** La deuda se genera al suscribirse; el pago es obligatorio al terminar el trial. No pueden cambiar de plan sin pagar lo que deben.

### 2.3 Overrides (aumento de capacidad)

```
1. Junta solicita overrides (más usuarios, storage, cartas)
2. Se calcula el monto según precios por demanda del plan
3. Se crea Factura (tipo AJUSTE o OVERRIDE) con ese monto
4. "Pagar ahora" → Wompi → pago obligatorio para aprobar el override
5. Al confirmar pago → se actualizan overrideLimite* en Suscripción
```

**Regla:** Override = pago al momento. Sin pago = sin override.

### 2.4 Cambio de plan (upgrade)

```
1. Junta elige plan superior
2. Resumen: plan nuevo, periodo, precio
3. "Pagar ahora" → factura + Wompi
4. Al confirmar pago → se actualiza Suscripción (plan, fechaVencimiento)
```

**Regla:** Upgrade = pago al momento. Sin pago = sin upgrade.

### 2.5 Renovación (mensual/anual) – después del primer periodo

```
1. Suscripción vence (fechaVencimiento < hoy)
2. Cron o lógica: genera factura por el siguiente periodo
3. Junta debe pagar para renovar
4. Al pagar → se actualiza fechaVencimiento de la Suscripción
```

**Nota:** La renovación sí puede ser "factura generada" + "pagar cuando pueda", pero con consecuencias: Suscripción VENCIDA hasta que pague.

---

## 3. Cambios necesarios

### 3.1 Backend

| Componente | Cambio |
|------------|--------|
| **Crear suscripción (sin trial)** | No crear Suscripción directamente. Crear Factura + IntenciónPago → al confirmar pago en webhook/retorno → crear Suscripción. |
| **Crear suscripción (con trial)** | Crear Suscripción PRUEBA + Factura PENDIENTE (fechaVencimiento = fin trial). No crear intención pago aún. |
| **Fin de trial** | Cron o job: cuando fechaVencimiento de factura de trial = hoy, Suscripción → VENCIDA. Junta puede "Pagar ahora" en esa factura. Al pagar → Suscripción ACTIVA, nueva fechaVencimiento. |
| **Solicitar overrides** | Calcular monto (precios por demanda). Crear Factura. Crear IntenciónPago. Al pagar → aplicar overrides. |
| **Cambiar plan (upgrade)** | Crear Factura. Crear IntenciónPago. Al pagar → actualizar Suscripción. |
| **Cron facturas mensuales** | Eliminar o modificar: ya no genera facturas para "suscribirse". Solo genera facturas de RENOVACIÓN cuando el periodo (mensual/anual) vence. |

### 3.2 Nuevos flujos

| Flujo | Descripción |
|-------|-------------|
| **Intención pago suscripción** | Crear factura "on the fly" por plan + periodo, crear intención, redirigir a Wompi. Al retorno: crear Suscripción si no existe. |
| **Intención pago override** | Crear factura por monto override, crear intención. Al retorno: aplicar overrides. |
| **Intención pago upgrade** | Similar a suscripción: factura + intención. Al retorno: actualizar Suscripción. |
| **Intención pago factura existente** | Ya existe (facturas pendientes, renovación). Sin cambios. |

### 3.3 Modelo de datos

| Cambio | Motivo |
|--------|--------|
| **Factura.suscripcionId** | Ya puede ser null. Se usa para facturas creadas antes de la Suscripción (pago al suscribirse). |
| **Nuevo tipo Factura** | Añadir a enum TipoFactura: `SUSCRIPCION` (plan nuevo), `RENOVACION` (periodo siguiente), `OVERRIDE` (aumento capacidad), `UPGRADE` (cambio plan). Actual: MENSUAL, MANUAL, AJUSTE. |
| **IntencionPagoFactura** | Ya existe. Puede usarse para facturas creadas "on the fly" (sin Suscripción aún). |
| **Metadata en Factura** | Guardar planId, periodo, diasPrueba, juntaId para poder crear Suscripción al confirmar pago. |

### 3.4 Frontend

| Flujo | Cambio |
|-------|--------|
| **Crear suscripción (sin trial)** | PlanSelector → Resumen → "Pagar ahora" → API crea factura + intención → redirect Wompi → retorno → verificar → crear suscripción (backend) → mostrar éxito. |
| **Crear suscripción (con trial)** | PlanSelector → Resumen → "Comenzar prueba" → crea Suscripción + Factura pendiente. Mensaje: "Al terminar el trial deberá pagar para continuar." |
| **Solicitar overrides** | SolicitarOverrides → calcular monto → "Pagar X COP" → factura + intención → Wompi → al pagar → aplicar. |
| **Cambiar plan (upgrade)** | PlanSelector → Resumen → "Pagar ahora" → igual que crear sin trial. |

---

## 4. Orden de implementación sugerido

### Fase 1: Preparación
1. Añadir tipo `SUSCRIPCION` (y otros) a enum `TipoFactura` si no existe.
2. Extender `Factura.metadata` para guardar `planId`, `periodo`, `diasPrueba` (para crear Suscripción al confirmar pago).
3. Endpoint: `POST /facturas-plataforma/intencion-suscripcion` (o similar) que recibe planId, periodo, diasPrueba, crea Factura temporal, crea IntenciónPago, retorna checkoutUrl.

### Fase 2: Flujo suscripción sin trial
1. Modificar frontend: al elegir plan sin trial, no llamar a `crearSuscripcion`. Llamar a `crearIntencionPagoSuscripcion`.

2. Backend: nuevo método que:
   - Crea Factura (tipo SUSCRIPCION, monto = precioMensual o precioAnual según periodo)
   - Crea IntencionPagoFactura
   - Retorna checkoutUrl

3. Webhook/retorno: al registrar pago de factura tipo SUSCRIPCION sin suscripcionId:
   - Crear Suscripción con planId, periodo, fechaVencimiento
   - Asociar factura a la suscripción

### Fase 3: Flujo suscripción con trial
1. Mantener `crearSuscripcion` para plan con trial.
2. Al crear: también crear Factura PENDIENTE (fechaVencimiento = fin trial, monto = precio según periodo).
3. Mensaje claro: "La deuda se genera al terminar el trial. Deberá pagar para continuar."

### Fase 4: Flujo overrides
1. SolicitarOverrides: calcular monto con precios por demanda.
2. Crear Factura tipo OVERRIDE.
3. "Pagar ahora" → IntenciónPago → al confirmar → aplicar overrides.

### Fase 5: Flujo upgrade
1. Similar a suscripción sin trial: factura + intención. Al pagar → actualizar Suscripción.

### Fase 6: Cron facturas
1. Eliminar o modificar `generarFacturasMensuales` para que solo genere facturas de RENOVACIÓN (cuando el periodo de la suscripción vence).
2. Lógica: si fechaVencimiento de Suscripción está próxima o pasó, generar factura de renovación.

---

## 5. Resumen de flujos correctos

| Acción | ¿Cuándo se paga? | ¿Cuándo se crea/actualiza Suscripción? |
|--------|------------------|----------------------------------------|
| Suscribirse sin trial | Al elegir plan (antes de tener suscripción) | Después del pago |
| Suscribirse con trial | Al terminar el trial | Al elegir plan (antes del pago) |
| Solicitar overrides | Al solicitar (antes de tener overrides) | Después del pago |
| Cambiar plan (upgrade) | Al elegir nuevo plan (antes del cambio) | Después del pago |
| Renovar periodo | Cuando vence (factura ya existe) | Al pagar |

---

## 6. Referencias

- `FLUJOS_SUSCRIPCIONES_PLANES.md` – **Flujos detallados** por caso (crear, trial, upgrade, overrides, renovación)
- `FACTURACION_PLATAFORMA_PAGO_ONLINE_ANALISIS.md` – Pago online facturas
- `REGLAS_SUSCRIPCION_COMPLETAS.md` – Reglas de fechas y variables
- `REVISION_TECNICA_PLANES_SUSCRIPCIONES.md` – Estado actual del módulo
- `apps/backend/src/platform/facturas/platform-facturas.service.ts`
- `apps/backend/src/platform/facturas/platform-facturas-public.controller.ts`
