import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FacturasPlataformaService } from '../../../core/services/facturas-plataforma.service';

@Component({
  selector: 'app-facturas-retorno',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './facturas-retorno.component.html',
  styleUrl: './facturas-retorno.component.scss',
})
export class FacturasRetornoComponent implements OnInit {
  loading = true;
  resultado: { registrado: boolean; codigo: string; mensaje: string } | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly facturasSvc: FacturasPlataformaService,
  ) {}

  ngOnInit(): void {
    const transactionId =
      this.route.snapshot.queryParamMap.get('transaction_id') ??
      this.route.snapshot.queryParamMap.get('id');
    const facturaId = this.route.snapshot.queryParamMap.get('factura_id');

    if (!transactionId || !facturaId) {
      this.loading = false;
      this.resultado = {
        registrado: false,
        codigo: 'PARAMETROS_INVALIDOS',
        mensaje: 'Faltan parámetros en la URL. Vuelve desde el flujo de pago.',
      };
      return;
    }

    this.facturasSvc.verificarPago(facturaId, transactionId).subscribe({
      next: (r) => {
        this.resultado = r;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.resultado = {
          registrado: false,
          codigo: 'ERROR',
          mensaje: this.extraerMensajeError(err),
        };
      },
    });
  }

  private extraerMensajeError(err: HttpErrorResponse): string {
    const body = err.error as { message?: string | string[] } | null;
    if (typeof body?.message === 'string') return body.message;
    if (Array.isArray(body?.message)) return body.message.join('. ');
    const porStatus: Record<number, string> = {
      400: 'Solicitud inválida. Verifica los datos e intenta de nuevo.',
      401: 'Sesión expirada. Inicia sesión de nuevo.',
      403: 'No tienes permiso para verificar este pago.',
      500: 'Error del servidor. Intenta más tarde.',
    };
    return porStatus[err.status] ?? 'No se pudo verificar el pago. Intenta más tarde.';
  }

  volver(): void {
    this.router.navigate(['/app/facturas-plataforma']);
  }
}
