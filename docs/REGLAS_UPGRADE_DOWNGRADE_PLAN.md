# Reglas de upgrade y downgrade de planes

## Resumen

| Tipo | Cuándo solicitar | Cuándo es efectivo | Fecha de vencimiento | Validaciones |
|------|------------------|-------------------|----------------------|--------------|
| **Upgrade** | Siempre | Después del pago | Nueva fecha = hoy + periodo | Ninguna |
| **Downgrade** | Cualquier día | Fin del ciclo actual (o forzar admin) | Se mantiene hasta fin de ciclo | Uso ≤ límites del plan destino |
| **Cambio periodo (mensual→anual)** | Siempre | Después del pago | Nueva fecha según periodo | Solo upgrade de periodo |

## Upgrade (cambio a plan superior)

- **Permitido**: En cualquier momento.
- **Pago**: Obligatorio al momento.
- **Fecha de vencimiento**: Nueva fecha = hoy + periodo (1 mes o 1 año según elección).
- **Overrides**: Se limpian (el nuevo plan tiene mayor capacidad base).

## Downgrade (cambio a plan inferior)

- **Permitido solicitar**: **Cualquier día** (no hay restricción de "día 1").
- **Efectivo**: Al final del ciclo actual (cuando vence la vigencia).
- **Excepción**: Platform admin puede usar `forzarDowngrade: true` para aplicar el cambio inmediato.
- **Validaciones**:
  - Usuarios actuales ≤ `plan.limiteUsuarios` (o ilimitado si `permiteUsuariosIlimitados`).
  - Storage usado (MB) ≤ `plan.limiteStorageMb` (o ilimitado si `permiteStorageIlimitado`).
  - Cartas este mes ≤ `plan.limiteCartasMes` (o ilimitado si `permiteCartasIlimitadas`).
- **Errores**:
  - `DowngradeUsoExcedeLimitesError`: si el uso excede los límites del plan destino.
- **Overrides**: Se limpian al cambiar de plan.

## Cambio de periodo (mensual → anual, mismo plan)

- **Permitido**: Solo upgrade de periodo (mensual → anual). No anual → mensual en mismo tier.
- **Pago**: Obligatorio al momento.
- **Sin trial**: No se aplican días de prueba en este cambio.

## Referencias

- **Flujos detallados**: `FLUJOS_SUSCRIPCIONES_PLANES.md` – Recorrido paso a paso (upgrade, downgrade, etc.)
- **Documento completo**: `REGLAS_SUSCRIPCION_COMPLETAS.md` – Todas las variables (diasPrueba, periodo, etc.)
- `apps/backend/src/common/utils/suscripcion-fechas.util.ts` – Cálculo centralizado de fechas
- `apps/backend/src/infrastructure/limits/limites.service.ts` – `validarCambioPlan()`
- `apps/backend/src/application/mi-junta/mi-junta.service.ts` – `actualizarSuscripcion()`
- `apps/backend/src/platform/juntas/platform-juntas.service.ts` – `actualizarSuscripcion()`
