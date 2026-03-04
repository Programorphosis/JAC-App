# Vigencia de la carta laboral

**Referencia:** flujoSolicitudCarta.md, validacionesDeCartaQR.md

## Concepto

La carta laboral tiene un período de validez (por defecto 3 meses). Una vez vencida, el afiliado debe pagar nuevamente y solicitar otra.

## Modelo de datos

### Junta
- **vigenciaCartaMeses** (Int?, default 3): meses de validez de las cartas emitidas por la junta.

### Carta
- **vigenciaHasta** (DateTime?): fecha límite de validez. Se calcula al aprobar: `fechaEmision + vigenciaCartaMeses`.

## Reglas de negocio

1. **Al aprobar carta:** Se calcula `vigenciaHasta = fechaEmision + vigenciaCartaMeses` (desde Junta, default 3).

2. **Solicitar nueva carta:** No se permite si el usuario tiene una carta APROBADA con `vigenciaHasta >= hoy`. Debe esperar a que venza.

3. **Registrar pago CARTA:** No se permite si el usuario tiene una carta vigente. Evita pagos adelantados, accidentales o innecesarios. Solo cuando la carta haya vencido puede pagar y solicitar otra.

4. **Validación pública (QR):** Si `vigenciaHasta < ahora` → "Carta vencida". Si `vigenciaHasta` es null (legacy) → se considera válida.

## Frontend

- Se muestra "Vigente hasta DD/MM/YYYY" en la carta aprobada.
- Si tiene carta vigente: mensaje "Debe esperar a que venza para solicitar otra (o pagar nuevamente)".
- Columna "Vigente hasta" en la tabla de cartas.
