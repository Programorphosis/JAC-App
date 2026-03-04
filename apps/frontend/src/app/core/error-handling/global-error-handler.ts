import { ErrorHandler, Injectable, NgZone, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly snackBar = inject(MatSnackBar);
  private readonly zone = inject(NgZone);

  handleError(error: unknown): void {
    const unwrapped = this.unwrap(error);

    if (unwrapped instanceof HttpErrorResponse) {
      // Los errores HTTP manejados por handleApiError() ya mostraron su SnackBar.
      // Solo logueamos si llegaron aquí sin capturar.
      console.error('[HTTP]', unwrapped.status, unwrapped.url, unwrapped.message);
      return;
    }

    console.error('[Unhandled]', unwrapped);

    this.zone.run(() => {
      this.snackBar.open(
        'Ocurrió un error inesperado. Intenta de nuevo.',
        'Cerrar',
        { duration: 6000 },
      );
    });

    // TODO: enviar a Sentry cuando se configure (punto 7.2 de AUDITORIA_DEVOPS.md)
    // Sentry.captureException(unwrapped);
  }

  private unwrap(error: unknown): unknown {
    // Angular envuelve errores de template en un objeto con propiedad `rejection` o `ngOriginalError`
    if (error && typeof error === 'object') {
      const e = error as Record<string, unknown>;
      if (e['rejection']) return e['rejection'];
      if (e['ngOriginalError']) return e['ngOriginalError'];
    }
    return error;
  }
}
