---
name: jac-debt-calculation
description: Implements or reviews the calculation of junta debt (DebtService). Use when working on debt calculation, DebtService, endpoints /deuda or /usuarios/:id/deuda, or when validating payment amounts against calculated debt. References calculadoraDeDeuda.md.
---

# Cálculo de deuda JAC

## Cuándo usar esta skill

- Implementar o modificar `DebtService` o `calculateUserDebt`.
- Implementar endpoints que exponen deuda (ej. `GET /usuarios/:id/deuda` o `/deuda/detalle`).
- Validar que el monto de un pago coincida con la deuda antes de registrar.

## Principios inmutables

- La deuda **no se guarda** en base de datos. Siempre se calcula bajo demanda.
- El backend **nunca** acepta monto de deuda desde el frontend; siempre recalcula.
- La deuda depende del **estado laboral histórico** por mes, no solo del estado actual.
- No existen pagos parciales: un pago debe ser exactamente el total calculado.

## Algoritmo (resumen)

1. Obtener **último pago** tipo JUNTA del usuario. Si no hay → fecha inicio = fechaCreacion del usuario (o fecha de afiliación si existiera un campo explícito en el negocio). A efectos de cálculo, "fecha de afiliación" es la que use el negocio (p. ej. fechaCreacion del usuario o un campo futuro fechaAfiliacion).
2. **Fecha fin** = último día del mes anterior a hoy (nunca cobrar el mes en curso).
3. Generar lista de **meses vencidos** entre inicio y fin (cada mes es una unidad de cobro).
4. Para **cada mes**: obtener estado laboral vigente en ese mes (historial_laboral); obtener tarifa vigente para ese estado y fecha (tarifas); acumular valor.
5. Devolver `{ total, detalle }`. Detalle opcional: por mes, estado laboral y tarifa aplicada.

## Errores explícitos

- Si no hay historial laboral para un mes → error (inconsistencia de datos).
- Si no hay tarifa vigente para un mes → error.
- No ignorar inconsistencias en silencio.

## Validación de pago

Antes de registrar un pago tipo JUNTA:

- Llamar `calculateUserDebt(usuarioId)` (idealmente **dentro** de la misma transacción donde se inserta el pago).
- Si `deuda.total === 0` → rechazar ("Usuario ya al día").
- Si `monto !== deuda.total` → rechazar ("Pago debe ser total").

## Documento de referencia

Especificación completa: **calculadoraDeDeuda.md** en la raíz del proyecto.
