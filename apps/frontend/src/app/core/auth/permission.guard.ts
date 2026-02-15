import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

/** Redirige a / si el usuario no tiene el permiso indicado. */
export function requirePermission(check: (auth: AuthService) => boolean): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (check(auth)) {
      return true;
    }
    router.navigate(['/']);
    return false;
  };
}

export const pagosGuard = requirePermission((a) => a.puedeVerPagos());
export const tarifasGuard = requirePermission((a) => a.puedeVerTarifas());
export const cartasGuard = requirePermission((a) => a.puedeVerCartasPendientes());
export const requisitosGuard = requirePermission((a) => a.puedeVerRequisitos());
export const usuariosGuard = requirePermission((a) => a.puedeVerUsuarios());

/** Solo ADMIN o SECRETARIA pueden crear usuarios. */
export const crearUsuarioGuard = requirePermission(
  (a) => a.hasRole('ADMIN') || a.hasRole('SECRETARIA')
);
