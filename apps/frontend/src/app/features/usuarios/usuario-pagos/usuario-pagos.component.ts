import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PagosService, PagoListItem } from '../../pagos/services/pagos.service';
import { FormatearFechaHoraPipe } from '../../../shared/pipes/formatear-fecha-hora.pipe';

/**
 * Historial de pagos del usuario actual. Solo lectura.
 * Usado por AFILIADO en Mi cuenta (no tiene acceso a /pagos).
 */
@Component({
  selector: 'app-usuario-pagos',
  standalone: true,
  imports: [
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    FormatearFechaHoraPipe,
  ],
  templateUrl: './usuario-pagos.component.html',
  styleUrl: './usuario-pagos.component.scss',
})
export class UsuarioPagosComponent implements OnInit {
  pagos: PagoListItem[] = [];
  loading = false;
  total = 0;
  page = 1;
  limit = 10;

  readonly displayedColumns = ['fechaPago', 'tipo', 'metodo', 'monto', 'consecutivo'];

  constructor(private readonly pagosSvc: PagosService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.pagosSvc.listarMiHistorial({ page: this.page, limit: this.limit }).subscribe({
      next: (res) => {
        this.pagos = res.data ?? [];
        this.total = res.meta?.total ?? 0;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex + 1;
    this.limit = e.pageSize;
    this.cargar();
  }

  formatearMoneda(n: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(n);
  }
}
