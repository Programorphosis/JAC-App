import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getAccessToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && auth.getRefreshToken()) {
        return auth.refreshToken().pipe(
          switchMap((result) => {
            if (result) {
              authReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${result.accessToken}`,
                },
              });
              return next(authReq);
            }
            router.navigate(['/login']);
            return throwError(() => err);
          }),
          catchError(() => {
            auth.logout();
            return throwError(() => err);
          })
        );
      }
      if (err.status === 401) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
