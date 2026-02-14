import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const platformAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isPlatformAdmin()) {
    return true;
  }
  if (auth.isAuthenticated()) {
    router.navigate(['/']);
    return false;
  }
  router.navigate(['/login']);
  return false;
};
