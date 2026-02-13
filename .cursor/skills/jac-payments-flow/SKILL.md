---
name: jac-payments-flow
description: Implements or reviews payment flows (cash, online, webhook, reconciliation). Use when working on payments, Wompi integration, webhooks, payment controllers, or double-payment/race conditions. References flujoDePagos, flujoDePagosCasoFallaWebhook, flujoDePagosCondicionDeCarrera.
---

# Flujo de pagos JAC

## Cuándo usar esta skill

- Implementar registro de pago (efectivo u online).
- Integrar Wompi (intención de pago, webhook, retorno, reconciliación).
- Evitar doble registro o condición de carrera en pagos.

## Reglas de negocio

- Solo pagos **totales**. El monto = deuda calculada en el momento del registro.
- Backend **nunca** confía en el monto enviado por frontend; siempre recalcula deuda.
- Misma tabla `pagos` y mismo flujo lógico para efectivo, transferencia y online; solo cambia quién inicia y quién confirma.
- Campo `consecutivo` es obligatorio en Pago (obtenido de tabla Consecutivo o lógica por junta/tipo/anio).
- Método puede ser EFECTIVO, TRANSFERENCIA u ONLINE. Para TRANSFERENCIA, referenciaExterna es el consecutivo o número de la transferencia.

## Capas de protección (pagos online)

1. **Idempotencia**: `referenciaExterna` en Pago debe ser `@unique`. Misma referencia = mismo pago (una sola vez).
2. **Función única**: `registerPaymentFromProvider(transactionData)` usada por: webhook, endpoint de retorno, job de reconciliación. Misma validación y transacción en los tres.
3. **Retorno del usuario**: Al volver de Wompi, consultar estado de la transacción en la API de Wompi; si APPROVED, llamar a la misma lógica de registro (rescate si el webhook falló).
4. **Reconciliación nocturna**: Job que compara transacciones APPROVED del día en Wompi con la base; registra las faltantes.
5. **Transacción serializable**: Registrar pago dentro de `prisma.$transaction(..., { isolationLevel: 'Serializable' })`. Recalcular deuda **dentro** de esa transacción, no fuera.

## Evitar condición de carrera (doble pago)

- Recalcular deuda **dentro** de la transacción antes de insertar.
- Si dos webhooks llegan a la vez: uno inserta y commit; el otro recalcula (deuda ya 0) y falla o choca con unique por referenciaExterna. Manejar error de serialización con mensaje claro ("Pago ya registrado o estado cambiado. Reintente.").

## Documentos de referencia

- **flujoDePagos.md** – Efectivo vs online, pasos.
- **flujoDePagosCasoFallaWebhook.md** – Fallo de webhook, rescate, reconciliación.
- **flujoDePagosCondicionDeCarrera.md** – Transacción serializable, idempotencia, doble pago.
