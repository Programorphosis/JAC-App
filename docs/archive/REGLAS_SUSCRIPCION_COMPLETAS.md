# Reglas completas de suscripción

Documento único de referencia para creación, actualización y fechas de suscripciones.

> **Flujos detallados:** Ver `FLUJOS_SUSCRIPCIONES_PLANES.md` para el recorrido paso a paso de cada caso.

---

## Variables de entrada

| Variable | Dónde | Descripción | Default |
|----------|-------|-------------|---------|
| `planId` | Crear / Cambiar | ID del plan | — |
| `diasPrueba` | Crear | Días de prueba. 0 = sin prueba, usar periodo | plan.diasPrueba |
| `periodo` | Crear / Cambiar (upgrade) | Facturación mensual o anual | anual |
| `fechaVencimiento` | Platform admin | Fecha explícita (solo platform) | — |
| `forzarDowngrade` | Platform admin | Aplica downgrade inmediato (sin esperar fin de ciclo) | false |

---

## Crear suscripción

### Lógica de fechas

```
SI diasPrueba > 0:
  fechaVencimiento = hoy + diasPrueba días
  estado = PRUEBA

SI NO (diasPrueba = 0):
  SI periodo = 'mensual':
    fechaVencimiento = hoy + 1 mes
  SI NO (anual):
    fechaVencimiento = hoy + 1 año
  estado = ACTIVA
```

### Origen de diasPrueba

- Frontend envía: `diasPrueba ?? plan.diasPrueba ?? 0`
- Si el plan tiene 14 días de prueba y el usuario no elige "sin prueba", se usa 14.
- Si el usuario elige "empezar a pagar ya", se envía 0 y aplica periodo.

---

## Cambiar plan (actualizar suscripción)

### Upgrade (plan superior)

- **Permitido**: Siempre.
- **Fecha de vencimiento**: Se recalcula = hoy + periodo (1 mes o 1 año).
- **Overrides**: Se limpian.
- **periodo**: Obligatorio desde frontend. Default anual si no se envía.

### Downgrade (plan inferior)

- **Permitido solicitar**: Cualquier día.
- **Efectivo**: Al final del ciclo actual (cuando vence la vigencia).
- **Excepción**: Platform admin puede `forzarDowngrade: true` para aplicar inmediato.
- **Fecha de vencimiento**: Se mantiene hasta fin de ciclo.
- **Validaciones**: Uso ≤ límites del plan destino.
- **Overrides**: Se limpian.

### Cambio de periodo (mensual → anual, mismo plan)

- **Permitido**: Solo upgrade de periodo (mensual → anual).
- **Pago**: Obligatorio al momento.
- **Sin trial**: No se aplican días de prueba.

---

## Días de prueba – detalle

1. **Durante la prueba**: estado = PRUEBA. La junta tiene acceso completo.
2. **Al vencimiento**: Un cron marca la suscripción como VENCIDA si `fechaVencimiento < hoy`.
3. **No hay conversión automática**: Al terminar la prueba, la junta debe crear/renovar suscripción (o el admin de plataforma).
4. **Cambio de plan durante prueba**: Si la junta está en PRUEBA y hace upgrade, se aplica la lógica de upgrade (nueva fecha según periodo).

---

## Implementación

- **Utilidad**: `apps/backend/src/common/utils/suscripcion-fechas.util.ts`
- **Servicios**: mi-junta.service, platform-juntas.service
- **Límites**: limites.service (validarCambioPlan)

## Referencias

- `FLUJOS_SUSCRIPCIONES_PLANES.md` – Flujos paso a paso por caso
