/**
 * Utilidades para barras de progreso (uso vs límites).
 */

/** Porcentaje de progreso (0-100). */
export function progreso(actual: number, limite: number): number {
  if (limite <= 0) return 0;
  return Math.min((actual / limite) * 100, 100);
}

/** Clase Tailwind para el color según porcentaje. */
export function colorProgreso(pct: number): string {
  if (pct >= 100) return 'bg-red-500';
  if (pct >= 80) return 'bg-amber-500';
  return 'bg-green-500';
}

/** Ancho de barra (0-100). */
export function barWidth(pct: number): number {
  return Math.min(pct, 100);
}
