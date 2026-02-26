/**
 * Extrae el código de error de dominio de la respuesta API.
 * DomainExceptionFilter devuelve { code } cuando es DomainError.
 */
export function getApiErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const e = err as Record<string, unknown>;
  const body = e['error'];
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    const code = b['code'];
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/**
 * Extrae mensaje de error de respuestas HTTP de la API.
 * NestJS: { statusCode, message, error }
 * Convenciones API: { error: { code, message } }
 * Validación: { message: string[] }
 */
export function getApiErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Error desconocido';
  const e = err as Record<string, unknown>;
  const body = e['error'];
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    const nested = b['error'] as Record<string, unknown> | undefined;
    const nestedMsg = nested?.['message'];
    if (nested && typeof nestedMsg === 'string') return nestedMsg;
    const bodyMsg = b['message'];
    if (typeof bodyMsg === 'string') return bodyMsg;
    if (Array.isArray(bodyMsg)) return bodyMsg.join('. ') || 'Error de validación';
  } else if (typeof body === 'string') {
    return body;
  }
  const topMsg = e['message'];
  if (typeof topMsg === 'string') return topMsg;
  return 'Error desconocido';
}
