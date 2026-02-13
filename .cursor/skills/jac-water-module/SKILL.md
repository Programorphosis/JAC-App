---
name: jac-water-module
description: Implements or reviews the water module (state, obligation, history, monthly cutoff). Use when working on water status, EstadoAgua, HistorialAgua, RECEPTOR_AGUA role, or the day-1 monthly job that sets users to MORA. References flujoReceptorDeAgua.
---

# Módulo de agua JAC

## Cuándo usar esta skill

- Implementar cambio de estado de agua (AL_DIA / MORA) o cambio de obligación (exento / no exento).
- Implementar el job del día 1 que pasa a MORA a usuarios con obligación activa.
- Revisar que solo WaterService (o casos de uso que lo orquesten) modifiquen EstadoAgua e HistorialAgua.

## Principios del módulo

- El sistema **no** procesa dinero de agua ni guarda pagos de agua. Solo mantiene estado administrativo (AL_DIA / MORA).
- Estado y obligación se gestionan con **historial**: cada cambio genera registro en HistorialAgua (nunca cambiar sin historial).
- Multi-tenant: no hay juntaId en EstadoAgua; el aislamiento es vía `usuario.juntaId`. Toda consulta debe filtrar por junta (ej. `where: { usuario: { juntaId } }`).

## Cambio manual de estado (RECEPTOR_AGUA)

- Endpoint tipo `POST /usuarios/:id/agua` con `estado: "AL_DIA"` (o MORA si aplica).
- Validar rol RECEPTOR_AGUA y que el usuario pertenezca a la junta del token.
- En una transacción: actualizar EstadoAgua (estado, fechaUltimoCambio) y crear HistorialAgua (tipoCambio ESTADO, estadoAnterior, estadoNuevo, cambiadoPorId, cambioAutomatico: false).
- Registrar auditoría.

## Cambio de obligación (ADMIN)

- Endpoint tipo `PATCH /usuarios/:id/agua/obligacion` con `obligacionActiva: false` (exento).
- Transacción: update EstadoAgua.obligacionActiva y create HistorialAgua (tipoCambio OBLIGACION, obligacionAnterior, obligacionNueva, cambiadoPorId).
- Cambiar obligación no modifica automáticamente el estado (AL_DIA/MORA).

## Corte automático mensual (día 1)

- Job (cron) que ejecuta la lógica por junta (o todas).
- Regla: todos los usuarios con `obligacionActiva === true` y `estado === AL_DIA` pasan a `estado === MORA`. No hay pagos adelantados; si no pagó antes del 1, queda en MORA.
- En transacción: updateMany EstadoAgua; createMany HistorialAgua con tipoCambio ESTADO, estadoAnterior AL_DIA, estadoNuevo MORA, cambioAutomatico: true, cambiadoPorId: null (o sistema).
- Usuarios con obligacionActiva = false no se tocan.

## Integración con cartas

- Para emitir carta: si `obligacionActiva === true`, el usuario debe estar AL_DIA; si `obligacionActiva === false`, se omite la validación de estado de agua.

## Documento de referencia

**flujoReceptorDeAgua.md** – Modelo Prisma, flujos manual y automático, reglas duras.
