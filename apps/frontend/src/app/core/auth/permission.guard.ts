import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { PERMISSIONS } from './permissions.constants';

/** Redirige a / si el usuario no tiene el permiso indicado. */
export function requirePermission(permission: string): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.can(permission)) {
      return true;
    }
    router.navigate(['/app']);
    return false;
  };
}

/** Redirige a / si el usuario no tiene ninguno de los permisos indicados. */
export function requireAnyPermission(...permissions: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (permissions.some((p) => auth.can(p))) {
      return true;
    }
    router.navigate(['/app']);
    return false;
  };
}

export const pagosGuard = requireAnyPermission(
  PERMISSIONS.PAGOS_VER,
  PERMISSIONS.PAGOS_GESTIONAR,
);
export const facturasPlataformaGuard = requirePermission(PERMISSIONS.PAGOS_VER);
export const tarifasGuard = requirePermission(PERMISSIONS.TARIFAS_VER);
export const cartasGuard = requireAnyPermission(
  PERMISSIONS.CARTAS_VER,
  PERMISSIONS.CARTAS_VALIDAR,
);
export const requisitosGuard = requirePermission(PERMISSIONS.REQUISITOS_VER);
export const usuariosGuard = requirePermission(PERMISSIONS.USUARIOS_VER);
export const crearUsuarioGuard = requirePermission(PERMISSIONS.USUARIOS_CREAR);
export const auditoriasGuard = requirePermission(PERMISSIONS.AUDITORIAS_VER);
export const configuracionGuard = requirePermission(PERMISSIONS.JUNTA_CONFIG_WOMPI);
export const planSuscripcionGuard = requirePermission(
  PERMISSIONS.JUNTA_SUSCRIPCION_GESTIONAR,
);
