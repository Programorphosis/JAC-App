/**
 * Formato largo de fecha: "01 de enero de 2026".
 * Locale: es-CO (Colombia).
 */
export function formatearFechaLarga(f: string | Date | null | undefined): string {
  if (f == null) return '';
  const d = typeof f === 'string' ? new Date(f) : f;
  if (isNaN(d.getTime())) return '';
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = d.toLocaleDateString('es-CO', { month: 'long' });
  const anio = d.getFullYear();
  return `${dia} de ${mes} de ${anio}`;
}
