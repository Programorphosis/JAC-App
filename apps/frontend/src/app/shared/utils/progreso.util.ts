/**
 * Utilidades para barras de progreso (uso vs límites).
 */

/** Porcentaje de progreso (0-100). */
export function progreso(actual: number, limite: number): number {
  if (limite <= 0) return 0;
  return Math.min((actual / limite) * 100, 100);
}

/** Clase Tailwind según nivel: 80% Advertencia, 95% Crítico, 100% Bloqueo. */
export function colorProgreso(pct: number): string {
  if (pct >= 100) return 'bg-jac-error';
  if (pct >= 95) return 'bg-orange-500';
  if (pct >= 80) return 'bg-jac-warning';
  return 'bg-jac-success';
}

/** Ancho de barra (0-100). */
export function barWidth(pct: number): number {
  return Math.min(pct, 100);
}
