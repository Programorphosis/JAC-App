/**
 * Utilidades de formateo de fechas para la app.
 * Locale: es-CO (Colombia).
 */

/** Formatea fecha solo (dd/MM/yyyy). */
export function formatearFecha(f: string | Date | null | undefined): string {
  if (f == null) return '';
  const d = typeof f === 'string' ? new Date(f) : f;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CO');
}

/** Formatea fecha y hora (dd/MM/yyyy, hh:mm:ss). */
export function formatearFechaHora(f: string | Date | null | undefined): string {
  if (f == null) return '';
  const d = typeof f === 'string' ? new Date(f) : f;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-CO');
}
