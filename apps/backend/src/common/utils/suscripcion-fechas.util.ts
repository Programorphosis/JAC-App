/**
 * Utilidad centralizada para cálculo de fechas de suscripción.
 * Única fuente de verdad para crear/actualizar suscripciones.
 *
 * @see docs/REGLAS_SUSCRIPCION_COMPLETAS.md
 */

export const DIA_DE_CORTE = 1;

export type PeriodoFacturacion = 'mensual' | 'anual';

export interface CalcularFechaVencimientoInput {
  /** Fecha desde la cual calcular (normalmente hoy). */
  fechaInicio: Date;
  /** Días de prueba. Si > 0, ignora periodo y suma días. Estado = PRUEBA. */
  diasPrueba?: number;
  /** Facturación mensual o anual. Solo aplica si diasPrueba = 0. */
  periodo?: PeriodoFacturacion;
}

/**
 * Calcula fecha de vencimiento según reglas:
 *
 * 1. Si diasPrueba > 0: fechaInicio + diasPrueba días (suscripción en PRUEBA).
 * 2. Si diasPrueba = 0: fechaInicio + 1 mes (mensual) o + 1 año (anual) (suscripción ACTIVA).
 *
 * Nota: En meses cortos (ej. 31 ene + 1 mes), JS desborda: feb no tiene 31 → 2 mar.
 * Comportamiento nativo de Date; aceptable para facturación por periodo.
 *
 * @param input Parámetros de cálculo
 * @returns Fecha de vencimiento
 */
export function calcularFechaVencimiento(
  input: CalcularFechaVencimientoInput,
): Date {
  const base = new Date(input.fechaInicio);
  const dias = input.diasPrueba ?? 0;

  if (dias > 0) {
    base.setDate(base.getDate() + dias);
    return base;
  }

  const periodo = input.periodo ?? 'anual';
  if (periodo === 'mensual') {
    base.setMonth(base.getMonth() + 1);
  } else {
    base.setFullYear(base.getFullYear() + 1);
  }
  return base;
}

/**
 * Determina el estado de la suscripción según días de prueba.
 */
export function getEstadoSuscripcion(diasPrueba: number): 'PRUEBA' | 'ACTIVA' {
  return diasPrueba > 0 ? 'PRUEBA' : 'ACTIVA';
}
