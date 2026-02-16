/**
 * Permisos explícitos del sistema.
 * Deben coincidir con apps/backend/src/auth/permissions.constants.ts
 * El backend los incluye en login/refresh; el frontend solo verifica can().
 */
export const PERMISSIONS = {
  USUARIOS_VER: 'usuarios:ver',
  USUARIOS_CREAR: 'usuarios:crear',
  USUARIOS_EDITAR: 'usuarios:editar',
  USUARIOS_EDITAR_ROLES: 'usuarios:editarRoles',
  REQUISITOS_VER: 'requisitos:ver',
  REQUISITOS_MODIFICAR: 'requisitos:modificar',
  PAGOS_GESTIONAR: 'pagos:gestionar',
  PAGOS_VER: 'pagos:ver',
  PAGOS_PAGAR_ONLINE: 'pagos:pagarOnline',
  PAGOS_PAGAR_ONLINE_PROPIO: 'pagos:pagarOnline:propio',
  TARIFAS_VER: 'tarifas:ver',
  TARIFAS_MODIFICAR: 'tarifas:modificar',
  CARTAS_VALIDAR: 'cartas:validar',
  CARTAS_SOLICITAR: 'cartas:solicitar',
  AUDITORIAS_VER: 'auditorias:ver',
  DOCUMENTOS_SUBIR_OTROS: 'documentos:subir:otros',
  HISTORIAL_CREAR: 'historial:crear',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
