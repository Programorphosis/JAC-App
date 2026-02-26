/**
 * Permisos explícitos del sistema.
 * El backend los calcula desde roles y los incluye en login/refresh.
 * El frontend solo verifica can(permission) sin conocer reglas de roles.
 */
export const PERMISSIONS = {
  // Usuarios
  USUARIOS_VER: 'usuarios:ver',
  USUARIOS_CREAR: 'usuarios:crear',
  USUARIOS_EDITAR: 'usuarios:editar',
  USUARIOS_EDITAR_ROLES: 'usuarios:editarRoles',

  // Requisitos
  REQUISITOS_VER: 'requisitos:ver',
  REQUISITOS_MODIFICAR: 'requisitos:modificar',

  // Pagos
  PAGOS_GESTIONAR: 'pagos:gestionar',
  PAGOS_VER: 'pagos:ver',
  PAGOS_PAGAR_ONLINE: 'pagos:pagarOnline', // TESORERA: para cualquiera
  PAGOS_PAGAR_ONLINE_PROPIO: 'pagos:pagarOnline:propio', // AFILIADO/SECRETARIA: solo propio

  // Tarifas
  TARIFAS_VER: 'tarifas:ver',
  TARIFAS_MODIFICAR: 'tarifas:modificar',

  // Cartas
  CARTAS_VER: 'cartas:ver', // FISCAL: solo lectura
  CARTAS_VALIDAR: 'cartas:validar',
  CARTAS_SOLICITAR: 'cartas:solicitar', // AFILIADO: solo propio

  // Auditorías
  AUDITORIAS_VER: 'auditorias:ver',

  // Documentos
  DOCUMENTOS_SUBIR_OTROS: 'documentos:subir:otros', // ADMIN/TESORERA para otros

  // Historial laboral
  HISTORIAL_CREAR: 'historial:crear',

  // Configuración junta (solo ADMIN)
  JUNTA_CONFIG_WOMPI: 'junta:configWompi',
  JUNTA_DATOS_EDITAR: 'junta:datos:editar', // ADMIN: actualizar datos de contacto
  JUNTA_SUSCRIPCION_GESTIONAR: 'junta:suscripcion:gestionar', // TESORERA: elegir plan, cambiar plan
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
