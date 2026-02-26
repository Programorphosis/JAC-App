import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DecimalPipe, NgClass } from '@angular/common';
import { FacturasPlataformaService, FacturaPlataformaItem, EstadoFacturaJunta } from '../../../core/services/facturas-plataforma.service';
import { FormatearFechaPipe } from '../../../shared/pipes/formatear-fecha.pipe';
import { handleApiError } from '../../../shared/operators/handle-api-error.operator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';
import { MiJuntaService } from '../../mi-junta/services/mi-junta.service';

@Component({
  selector: 'app-facturas-plataforma',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
    DecimalPipe,
    NgClass,
    FormatearFechaPipe,
  ],
  templateUrl: './facturas-plataforma.component.html',
  styleUrl: './facturas-plataforma.component.scss',
})
export class FacturasPlataformaComponent implements OnInit {
  facturas: FacturaPlataformaItem[] = [];
  meta: { page: number; limit: number; total: number; totalPages: number } | null = null;
  loading = false;
  page = 1;
  pagandoId: string | null = null;

  private nombreJunta = '';

  constructor(
    private readonly facturasSvc: FacturasPlataformaService,
    private readonly snackBar: MatSnackBar,
    private readonly miJuntaSvc: MiJuntaService,
    readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.miJuntaSvc.obtener().subscribe({ next: (j) => { this.nombreJunta = j.nombre; } });
  }

  cargar(page = 1): void {
    this.loading = true;
    this.page = page;
    this.facturasSvc
      .listar(page, 20)
      .pipe(handleApiError(this.snackBar))
      .subscribe({
        next: (r) => {
          this.facturas = r.data;
          this.meta = r.meta;
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
  }

  claseEstado(estado: EstadoFacturaJunta): string {
    switch (estado) {
      case 'PAGADA':
        return 'bg-jac-success-bg text-jac-success';
      case 'PENDIENTE':
        return 'bg-jac-warning-bg text-jac-warning';
      case 'VENCIDA':
        return 'bg-jac-error-bg text-jac-error';
      case 'PARCIAL':
        return 'bg-jac-info-bg text-jac-info';
      case 'CANCELADA':
        return 'bg-jac-surface-raised text-jac-text-muted';
      default:
        return '';
    }
  }

  montoPendiente(f: FacturaPlataformaItem): number {
    const pagado = f.pagos.reduce((s, p) => s + p.monto, 0);
    return f.monto - pagado;
  }

  puedePagar(f: FacturaPlataformaItem): boolean {
    if (f.estado === 'PAGADA' || f.estado === 'CANCELADA') return false;
    return this.montoPendiente(f) > 0;
  }

  pagarAhora(f: FacturaPlataformaItem): void {
    this.pagandoId = f.id;
    this.facturasSvc
      .crearIntencionPago(f.id)
      .pipe(handleApiError(this.snackBar))
      .subscribe({
        next: (r) => {
          window.location.href = r.checkoutUrl;
        },
        error: () => {
          this.pagandoId = null;
        },
      });
  }

  verComprobante(f: FacturaPlataformaItem): void {
    this.facturasSvc.abrirComprobante(f, this.nombreJunta);
  }
}
