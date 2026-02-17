import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PagosService, VerificarPagoResult } from '../services/pagos.service';
import { AuthService } from '../../../core/auth/auth.service';

/** Resultado mostrado al usuario: éxito, fallo con mensaje, o error HTTP. */
type ResultadoMostrado = (VerificarPagoResult & { mensaje: string }) | null;

@Component({
  selector: 'app-pagos-retorno',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './pagos-retorno.component.html',
  styleUrl: './pagos-retorno.component.scss',
})
export class PagosRetornoComponent implements OnInit {
  loading = true;
  resultado: ResultadoMostrado = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly pagos: PagosService,
    readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    const transactionId = this.route.snapshot.queryParamMap.get('transaction_id') ?? this.route.snapshot.queryParamMap.get('id');
    const juntaId = this.route.snapshot.queryParamMap.get('junta_id');
    if (!transactionId || !juntaId) {
      this.loading = false;
      this.resultado = {
        registrado: false,
        codigo: 'TRANSACCION_NO_ENCONTRADA',
        mensaje: 'Faltan parámetros en la URL. Vuelve desde el flujo de pago.',
      };
      return;
    }
    this.pagos.verificarPagoOnline(transactionId, juntaId).subscribe({
      next: (r) => {
        this.resultado = r;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.resultado = {
          registrado: false,
          codigo: 'ESTADO_DESCONOCIDO',
          mensaje: this.extraerMensajeError(err),
        };
      },
    });
  }

  /** Extrae mensaje legible del error HTTP (convencionesAPI, Nest default). */
  private extraerMensajeError(err: HttpErrorResponse): string {
    const body = err.error as { message?: string | string[]; error?: { message?: string } } | null;
    if (body?.error?.message) return body.error.message;
    if (typeof body?.message === 'string') return body.message;
    if (Array.isArray(body?.message)) return body.message.join('. ');
    const porStatus: Record<number, string> = {
      400: 'Solicitud inválida. Verifica los datos e intenta de nuevo.',
      401: 'Sesión expirada o inválida. Inicia sesión de nuevo.',
      403: 'No tienes permiso para verificar este pago.',
      404: 'No se encontró la transacción o la intención de pago.',
      409: 'El pago ya fue registrado.',
      422: 'No se pudo procesar. Verifica que la junta tenga Wompi configurado.',
      500: 'Error del servidor. Intenta más tarde.',
    };
    return porStatus[err.status] ?? 'No se pudo verificar el pago. Intenta más tarde.';
  }

  volver(): void {
    const user = this.auth.currentUser();
    if (user && !this.auth.can(this.auth.permissions.PAGOS_GESTIONAR)) {
      this.router.navigate(['/usuarios', user.id]);
    } else {
      this.router.navigate(['/pagos']);
    }
  }

  formatearMoneda(v: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(v);
  }
}
