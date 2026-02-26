/**
 * Concatena el prefijo "Junta de Acción Comunal de" al nombre (jurisdicción) de la junta.
 * El nombre en BD debe ser solo la jurisdicción (ej: Vereda Rubiales, Barrio Centro).
 */
export function nombreCompletoJunta(jurisdiccion: string | null | undefined): string {
  const n = jurisdiccion?.trim();
  if (!n) return 'Junta de Acción Comunal';
  return `Junta de Acción Comunal de ${n}`;
}
