---
name: jac-historial-and-tarifas
description: Implements or reviews labor history and tariff management (versioned by date). Use when working on historial_laboral, tarifas, state-by-month for debt calculation, or when loading initial data from physical books. References plan.md, calculadoraDeDeuda.md.
---

# Historial laboral y tarifas JAC

## Cuándo usar esta skill

- Crear o consultar registros de historial laboral (estado TRABAJANDO / NO_TRABAJANDO por periodo).
- Gestionar tarifas por estado laboral y fecha de vigencia.
- Cargar datos iniciales desde libro físico (usuarios + historial).
- Asegurar que el cálculo de deuda tenga estado laboral y tarifa correctos por mes.

## Historial laboral

- Tabla: historial_laboral. Campos relevantes: usuarioId, estado (TRABAJANDO | NO_TRABAJANDO), fechaInicio, fechaFin (NULL = vigente), creadoPorId.
- **Nunca se edita ni borra** un registro histórico. Los cambios afectan solo periodos futuros: se inserta un nuevo registro con fechaInicio/fechaFin adecuados.
- Para cada mes del cálculo de deuda debe existir exactamente un estado laboral vigente (un registro que cubra ese mes). Si falta o hay superposición → error explícito, no ignorar.

## Tarifas

- Tabla: tarifas. Por junta: juntaId, estadoLaboral, valorMensual, fechaVigencia. Permiten que el valor cambie en el tiempo sin romper historia.
- Para un mes M y un estado E: obtener la tarifa con fechaVigencia <= último día de M, ordenar por fechaVigencia DESC, tomar la primera. Así se aplica la tarifa vigente en ese mes.

## Carga inicial

- Usuarios creados por ADMIN o SECRETARIA; carga inicial desde libro físico. No hay auto-registro. Mantener trazabilidad (creadoPor, auditoría si aplica).

## Uso en cálculo de deuda

DebtService genera los meses vencidos, para cada mes obtiene estado laboral vigente (historial_laboral) y tarifa vigente (tarifas), y acumula. Sin historial laboral o sin tarifa para un mes → error determinístico, no valor por defecto silencioso.

## Documento de referencia

**plan.md** (§4 Historial laboral, §4.1 Cuotas junta), **calculadoraDeDeuda.md** (§3 Entidades, §7–§8 estado y tarifa por mes).
