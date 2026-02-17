import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { DecimalPipe, NgClass } from '@angular/common';
import { FacturasPlataformaService, FacturaPlataformaItem, EstadoFacturaJunta } from '../../../core/services/facturas-plataforma.service';
import { FormatearFechaPipe } from '../../../shared/pipes/formatear-fecha.pipe';
import { handleApiError } from '../../../shared/operators/handle-api-error.operator';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-facturas-plataforma',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
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

  constructor(
    private readonly facturasSvc: FacturasPlataformaService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargar();
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
        return 'text-green-700';
      case 'PENDIENTE':
        return 'text-amber-700';
      case 'VENCIDA':
        return 'text-red-700';
      case 'PARCIAL':
        return 'text-blue-700';
      case 'CANCELADA':
        return 'text-gray-600';
      default:
        return '';
    }
  }

  montoPendiente(f: FacturaPlataformaItem): number {
    const pagado = f.pagos.reduce((s, p) => s + p.monto, 0);
    return f.monto - pagado;
  }
}
