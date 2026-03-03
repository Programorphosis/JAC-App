import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Usar después de authGuard. Si el usuario tiene requiereCambioPassword,
 * redirige a /cambiar-password para forzar el cambio antes de acceder al app.
 */
export const requireCambioPasswordGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.currentUser();
  if (user?.requiereCambioPassword) {
    router.navigate(['/cambiar-password']);
    return false;
  }
  return true;
};
