import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { FormsModule } from '@angular/forms';
import { AuditoriasService, AuditoriaItem } from '../services/auditorias.service';
import { FormatearNombrePipe } from '../../../shared/pipes/formatear-nombre.pipe';

type SortBy = 'fecha' | 'accion' | 'entidad';

@Component({
  selector: 'app-auditorias-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    FormsModule,
    ReactiveFormsModule,
    FormatearNombrePipe,
  ],
  templateUrl: './auditorias-list.component.html',
  styleUrl: './auditorias-list.component.scss',
})
export class AuditoriasListComponent implements OnInit, OnDestroy {
  displayedColumns = ['fecha', 'accion', 'entidad', 'ejecutadoPor', 'metadata'];
  dataSource = new MatTableDataSource<AuditoriaItem>([]);
  loading = false;
  total = 0;
  page = 1;
  limit = 25;
  filtroEntidad = '';
  searchControl = new FormControl('', { nonNullable: true });
  sortBy: SortBy = 'fecha';
  sortOrder: 'asc' | 'desc' = 'desc';

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly auditorias: AuditoriasService) {}

  ngOnInit(): void {
    this.cargar();
    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.cargar();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex + 1;
    this.limit = e.pageSize;
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    const search = this.searchControl.value.trim();
    this.auditorias
      .listar({
        page: this.page,
        limit: this.limit,
        entidad: this.filtroEntidad || undefined,
        search: search.length >= 2 ? search : undefined,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
      })
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.data;
          this.total = res.meta.total;
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
  }

  limpiarFiltros(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.filtroEntidad = '';
    this.page = 1;
    this.cargar();
  }

  ordenarPor(campo: SortBy): void {
    if (this.sortBy === campo) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = campo;
      this.sortOrder = campo === 'fecha' ? 'desc' : 'asc';
    }
    this.page = 1;
    this.cargar();
  }

  iconoOrden(campo: SortBy): string {
    if (this.sortBy !== campo) return 'unfold_more';
    return this.sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  formatearFecha(s: string): string {
    const d = new Date(s);
    return d.toLocaleString('es-CO');
  }

  resumirMetadata(m: Record<string, unknown>): string {
    if (!m || Object.keys(m).length === 0) return '-';
    const parts = Object.entries(m)
      .slice(0, 2)
      .map(([k, v]) => `${k}: ${String(v)}`);
    return parts.join(' · ');
  }
}
