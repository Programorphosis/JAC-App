import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UsuariosService, UsuarioListItem } from '../services/usuarios.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AppCanDirective } from '../../../core/auth/app-can.directive';
import { FormatearNombrePipe } from '../../../shared/pipes/formatear-nombre.pipe';

type SortBy = 'apellidos' | 'nombres' | 'numeroDocumento' | 'fechaCreacion';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    FormsModule,
    NgClass,
    AppCanDirective,
    FormatearNombrePipe,
  ],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.scss',
})
export class UsuariosListComponent implements OnInit, OnDestroy {
  displayedColumns = ['documento', 'nombres', 'roles', 'activo', 'acciones'];
  dataSource = new MatTableDataSource<UsuarioListItem>([]);
  loading = false;
  total = 0;
  page = 1;
  limit = 10;

  searchControl = new FormControl('', { nonNullable: true });
  activoFilter: 'todos' | boolean = 'todos';
  rolFilter = '';
  sortBy: SortBy = 'apellidos';
  sortOrder: 'asc' | 'desc' = 'asc';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly usuarios: UsuariosService,
    private readonly router: Router,
    readonly auth: AuthService
  ) {}

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

  cargar(): void {
    this.loading = true;
    const opts: Parameters<UsuariosService['listar']>[2] = {};
    const search = this.searchControl.value.trim();
    if (search.length >= 2) opts.search = search;
    if (this.activoFilter !== 'todos') opts.activo = this.activoFilter;
    if (this.rolFilter) opts.rol = this.rolFilter;
    opts.sortBy = this.sortBy;
    opts.sortOrder = this.sortOrder;

    this.usuarios.listar(this.page, this.limit, opts).subscribe({
      next: (res) => {
        this.dataSource.data = res.data;
        this.total = res.meta.total;
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

  cambiarActivo(v: 'todos' | boolean): void {
    this.activoFilter = v;
    this.page = 1;
    this.cargar();
  }

  cambiarRol(v: string): void {
    this.rolFilter = v;
    this.page = 1;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.activoFilter = 'todos';
    this.rolFilter = '';
    this.page = 1;
    this.cargar();
  }

  ordenarPor(campo: SortBy): void {
    if (this.sortBy === campo) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = campo;
      this.sortOrder = 'asc';
    }
    this.page = 1;
    this.cargar();
  }

  iconoOrden(campo: SortBy): string {
    if (this.sortBy !== campo) return 'unfold_more';
    return this.sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  ver(id: string): void {
    this.router.navigate(['/usuarios', id]);
  }

  crear(): void {
    this.router.navigate(['/usuarios', 'nuevo']);
  }

  documento(u: UsuarioListItem): string {
    return `${u.tipoDocumento} ${u.numeroDocumento}`;
  }


  roles(u: UsuarioListItem): string {
    return (u.roles || []).join(', ');
  }
}
