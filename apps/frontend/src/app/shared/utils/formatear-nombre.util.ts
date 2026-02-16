/** Formatea nombres con inicial de cada palabra en mayúscula. Ej: "juan carlos" → "Juan Carlos" */
export function formatearNombre(texto: string | null | undefined): string {
  if (!texto?.trim()) return texto ?? '';
  return texto
    .trim()
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}
