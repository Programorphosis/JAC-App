import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from './auth.service';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getAccessToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || !auth.getRefreshToken()) {
        if (err.status === 401) auth.logout();
        return throwError(() => err);
      }

      if (isRefreshing) {
        return refreshSubject.pipe(
          filter((t): t is string => t !== null),
          take(1),
          switchMap((newToken) =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })),
          ),
        );
      }

      isRefreshing = true;
      refreshSubject.next(null);

      return auth.refreshToken().pipe(
        switchMap((result) => {
          isRefreshing = false;
          if (result) {
            refreshSubject.next(result.accessToken);
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${result.accessToken}` } }));
          }
          router.navigate(['/login']);
          return throwError(() => err);
        }),
        catchError((refreshErr) => {
          isRefreshing = false;
          auth.logout();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
