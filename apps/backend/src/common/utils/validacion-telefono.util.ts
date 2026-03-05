/**
 * Validación y normalización de teléfonos Colombia.
 * Acepta: 3001234567, 573001234567, +573001234567.
 * Normaliza a E.164: +573001234567 (12 caracteres).
 */

const REGEX_TELEFONO_COLOMBIA = /^(\+?57)?[0-9]{10}$/;

/**
 * Valida si el valor es un teléfono colombiano válido (10 dígitos, opcional +57).
 */
export function validarTelefonoColombia(
  valor: string | null | undefined,
): boolean {
  if (valor == null || typeof valor !== 'string') return false;
  const limpio = valor.replace(/\s/g, '').trim();
  return REGEX_TELEFONO_COLOMBIA.test(limpio);
}

/**
 * Normaliza a E.164 (+573001234567). Retorna null si inválido.
 */
export function normalizarTelefonoColombia(
  valor: string | null | undefined,
): string | null {
  if (valor == null || typeof valor !== 'string') return null;
  const limpio = valor.replace(/\s/g, '').trim();
  if (!REGEX_TELEFONO_COLOMBIA.test(limpio)) return null;

  // Extraer los 10 dígitos
  const digitos = limpio.replace(/\D/g, '').slice(-10);
  return `+57${digitos}`;
}
