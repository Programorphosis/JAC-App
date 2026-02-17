/**
 * Mapeo roles → permisos.
 * Única fuente de verdad para qué puede hacer cada rol.
 */
import { RolNombre } from '@prisma/client';
import { PERMISSIONS, Permission } from './permissions.constants';

export function computePermissions(
  roles: RolNombre[],
  esModificador: boolean,
  juntaId: string | null,
): Permission[] {
  const set = new Set<Permission>();

  // Platform Admin: no aplica permisos de junta
  if (juntaId === null && roles.includes(RolNombre.PLATFORM_ADMIN)) {
    return [];
  }

  // ADMIN
  if (roles.includes(RolNombre.ADMIN)) {
    set.add(PERMISSIONS.JUNTA_CONFIG_WOMPI);
    set.add(PERMISSIONS.USUARIOS_VER);
    set.add(PERMISSIONS.USUARIOS_CREAR);
    set.add(PERMISSIONS.USUARIOS_EDITAR);
    set.add(PERMISSIONS.USUARIOS_EDITAR_ROLES);
    set.add(PERMISSIONS.REQUISITOS_VER);
    set.add(PERMISSIONS.REQUISITOS_MODIFICAR);
    set.add(PERMISSIONS.PAGOS_VER);
    set.add(PERMISSIONS.TARIFAS_VER);
    set.add(PERMISSIONS.TARIFAS_MODIFICAR);
    set.add(PERMISSIONS.AUDITORIAS_VER);
    set.add(PERMISSIONS.DOCUMENTOS_SUBIR_OTROS);
    set.add(PERMISSIONS.HISTORIAL_CREAR);
  }

  // SECRETARIA
  if (roles.includes(RolNombre.SECRETARIA)) {
    set.add(PERMISSIONS.USUARIOS_VER);
    set.add(PERMISSIONS.USUARIOS_CREAR);
    set.add(PERMISSIONS.USUARIOS_EDITAR);
    set.add(PERMISSIONS.PAGOS_VER);
    set.add(PERMISSIONS.TARIFAS_VER);
    set.add(PERMISSIONS.CARTAS_VALIDAR);
    set.add(PERMISSIONS.AUDITORIAS_VER);
  }

  // TESORERA
  if (roles.includes(RolNombre.TESORERA)) {
    set.add(PERMISSIONS.USUARIOS_VER);
    set.add(PERMISSIONS.PAGOS_GESTIONAR);
    set.add(PERMISSIONS.PAGOS_VER);
    set.add(PERMISSIONS.PAGOS_PAGAR_ONLINE);
    set.add(PERMISSIONS.TARIFAS_VER);
    set.add(PERMISSIONS.AUDITORIAS_VER);
    set.add(PERMISSIONS.DOCUMENTOS_SUBIR_OTROS);
    set.add(PERMISSIONS.HISTORIAL_CREAR);
  }

  // RECEPTOR_AGUA
  if (roles.includes(RolNombre.RECEPTOR_AGUA)) {
    set.add(PERMISSIONS.USUARIOS_VER);
  }

  // AFILIADO
  if (roles.includes(RolNombre.AFILIADO)) {
    set.add(PERMISSIONS.PAGOS_PAGAR_ONLINE_PROPIO);
    set.add(PERMISSIONS.CARTAS_SOLICITAR);
  }

  // SECRETARIA también puede pagar online para sí misma
  if (roles.includes(RolNombre.SECRETARIA)) {
    set.add(PERMISSIONS.PAGOS_PAGAR_ONLINE_PROPIO);
  }

  // Modificador (sin ADMIN/SECRETARIA/TESORERA) puede ver usuarios
  if (esModificador && juntaId && !set.has(PERMISSIONS.USUARIOS_VER)) {
    set.add(PERMISSIONS.USUARIOS_VER);
  }

  return Array.from(set);
}

/** Permisos para impersonación (PA-8): solo lectura. */
export function computePermissionsForImpersonation(): Permission[] {
  return [
    PERMISSIONS.USUARIOS_VER,
    PERMISSIONS.PAGOS_VER,
    PERMISSIONS.TARIFAS_VER,
    PERMISSIONS.REQUISITOS_VER,
    PERMISSIONS.AUDITORIAS_VER,
  ];
}
