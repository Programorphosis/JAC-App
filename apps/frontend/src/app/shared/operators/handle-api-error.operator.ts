import type { MonoTypeOperatorFunction } from 'rxjs';
import { tap } from 'rxjs';
import type { MatSnackBar } from '@angular/material/snack-bar';
import { getApiErrorMessage } from '../utils/api-error.util';

/**
 * Operador RxJS que muestra el mensaje de error de la API en un SnackBar.
 * El error sigue propagándose al subscribe, por lo que el callback error puede
 * usarse para limpieza (loading = false, navegación, etc.).
 *
 * Uso:
 *   this.service.obtener(id).pipe(handleApiError(this.snackBar)).subscribe({
 *     next: (data) => { ... },
 *     error: () => { this.loading = false; }
 *   });
 */
export function handleApiError<T>(snackBar: MatSnackBar): MonoTypeOperatorFunction<T> {
  return tap({
    error: (err) => snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 }),
  });
}
