import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { PagosService, PagoListItem, EstadisticasPagos } from '../services/pagos.service';
import { UsuariosService, UsuarioListItem } from '../../usuarios/services/usuarios.service';
import { AuthService } from '../../../core/auth/auth.service';
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';
import { formatearNombre } from '../../../shared/utils/formatear-nombre.util';
import { FormatearNombrePipe } from '../../../shared/pipes/formatear-nombre.pipe';

function usuarioRequerido(c: AbstractControl): ValidationErrors | null {
  const v = c.value;
  if (v && typeof v === 'object' && 'id' in v) return null;
  return { required: true };
}

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatTableModule,
    MatTabsModule,
    MatIconModule,
    MatPaginatorModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    FormsModule,
    FormatearNombrePipe,
  ],
  templateUrl: './pagos.component.html',
  styleUrl: './pagos.component.scss',
})
export class PagosComponent implements OnInit {
  usuariosFiltrados = signal<UsuarioListItem[]>([]);
  searchEfectivo$ = new Subject<string>();
  searchCarta$ = new Subject<string>();
  formEfectivo: FormGroup;
  formCarta: FormGroup;
  loading = false;

  pagos = signal<PagoListItem[]>([]);
  pagosMeta = signal<{ total: number; page: number; limit: number }>({ total: 0, page: 1, limit: 20 });
  pagosLoading = false;
  pagosPage = 1;
  pagosFiltros: { usuarioId?: string; tipo?: 'JUNTA' | 'CARTA' | ''; fechaDesde?: string; fechaHasta?: string } = {};
  pagosSearchControl = new FormControl('', { nonNullable: true });
  pagosSortBy: 'fechaPago' | 'monto' | 'tipo' | 'metodo' | 'consecutivo' = 'fechaPago';
  pagosSortOrder: 'asc' | 'desc' = 'desc';

  private readonly destroy$ = new Subject<void>();

  estadisticas = signal<EstadisticasPagos | null>(null);
  estadisticasLoading = false;

  readonly puedeVerListado = computed(() => this.auth.can(this.auth.permissions.PAGOS_VER));
  readonly displayedColumns = ['fechaPago', 'tipo', 'metodo', 'monto', 'usuarioNombre', 'consecutivo', 'registradoPorNombre'];

  /** Índice de la pestaña activa. Registrar = 1 si hay Dashboard, 0 si no. */
  selectedTabIndex = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly pagosSvc: PagosService,
    private readonly usuariosSvc: UsuariosService,
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
    private readonly snackBar: MatSnackBar
  ) {
    this.formEfectivo = this.fb.group({
      usuario: ['' as UsuarioListItem | string, [usuarioRequerido]],
      metodo: ['EFECTIVO', Validators.required],
      referenciaExterna: [''],
    });
    this.formCarta = this.fb.group({
      usuario: ['' as UsuarioListItem | string, [usuarioRequerido]],
      metodo: ['EFECTIVO', Validators.required],
      referenciaExterna: [''],
    });
  }

  ngOnInit(): void {
    this.searchEfectivo$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.usuariosSvc.listar(1, 50, term ? { search: term } : undefined))
      )
      .subscribe({
        next: (res) => this.usuariosFiltrados.set(res.data),
      });
    this.searchCarta$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.usuariosSvc.listar(1, 50, term ? { search: term } : undefined))
      )
      .subscribe({
        next: (res) => this.usuariosFiltrados.set(res.data),
      });
    this.formEfectivo.get('usuario')?.valueChanges?.subscribe((v) => {
      if (typeof v === 'string') this.searchEfectivo$.next(v);
    });
    this.formCarta.get('usuario')?.valueChanges?.subscribe((v) => {
      if (typeof v === 'string') this.searchCarta$.next(v);
    });
    this.searchEfectivo$.next('');
    this.searchCarta$.next('');
    if (this.puedeVerListado()) {
      this.cargarPagos();
      this.cargarEstadisticas();
      this.pagosSearchControl.valueChanges
        .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
        .subscribe(() => {
          this.pagosPage = 1;
          this.cargarPagos();
        });
    }
    this.route.queryParams.subscribe((params) => {
      if (params['tab'] === 'registrar') {
        this.selectedTabIndex = this.puedeVerListado() ? 1 : 0;
      } else if (params['tab'] === 'listado' && this.puedeVerListado()) {
        this.selectedTabIndex = 2;
      } else if (params['tab'] === 'dashboard' && this.puedeVerListado()) {
        this.selectedTabIndex = 0;
      }
    });
  }

  onSearchEfectivo(value: string): void {
    this.searchEfectivo$.next(value);
  }

  onSearchCarta(value: string): void {
    this.searchCarta$.next(value);
  }

  displayUsuario(u: UsuarioListItem | string | null): string {
    if (!u || typeof u === 'string') return u ?? '';
    return `${formatearNombre(u.nombres)} ${formatearNombre(u.apellidos)} (${u.tipoDocumento} ${u.numeroDocumento})`;
  }

  nombreUsuario(u: UsuarioListItem): string {
    return `${formatearNombre(u.nombres)} ${formatearNombre(u.apellidos)} (${u.tipoDocumento} ${u.numeroDocumento})`;
  }

  registrarEfectivo(): void {
    if (this.formEfectivo.invalid) return;
    const v = this.formEfectivo.value;
    const usuario = v.usuario as UsuarioListItem;
    if (!usuario?.id) return;
    if (v.metodo === 'TRANSFERENCIA' && !v.referenciaExterna?.trim()) {
      this.snackBar.open('Referencia es obligatoria para transferencia', 'Cerrar', { duration: 3000 });
      return;
    }
    this.loading = true;
    this.pagosSvc
      .registrarEfectivo({
        usuarioId: usuario.id,
        metodo: v.metodo,
        referenciaExterna: v.referenciaExterna?.trim() || undefined,
      })
      .subscribe({
        next: (r) => {
          this.loading = false;
          this.snackBar.open(`Pago registrado. Consecutivo: ${r.consecutivo}`, 'Cerrar', { duration: 4000 });
          this.formEfectivo.reset({ metodo: 'EFECTIVO' });
          if (this.puedeVerListado()) this.cargarPagos();
          if (this.puedeVerListado()) this.cargarEstadisticas();
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
        },
      });
  }

  registrarCarta(): void {
    if (this.formCarta.invalid) return;
    const v = this.formCarta.value;
    const usuario = v.usuario as UsuarioListItem;
    if (!usuario?.id) return;
    if (v.metodo === 'TRANSFERENCIA' && !v.referenciaExterna?.trim()) {
      this.snackBar.open('Referencia es obligatoria para transferencia', 'Cerrar', { duration: 3000 });
      return;
    }
    this.loading = true;
    this.pagosSvc
      .registrarCarta({
        usuarioId: usuario.id,
        metodo: v.metodo,
        referenciaExterna: v.referenciaExterna?.trim() || undefined,
      })
      .subscribe({
        next: (r) => {
          this.loading = false;
          this.snackBar.open(`Pago carta registrado. Consecutivo: ${r.consecutivo}`, 'Cerrar', { duration: 4000 });
          this.formCarta.reset({ metodo: 'EFECTIVO' });
          if (this.puedeVerListado()) this.cargarPagos();
          if (this.puedeVerListado()) this.cargarEstadisticas();
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
        },
      });
  }

  cargarPagos(): void {
    this.pagosLoading = true;
    const search = this.pagosSearchControl.value.trim();
    this.pagosSvc
      .listar({
        page: this.pagosPage,
        limit: this.pagosMeta().limit,
        usuarioId: this.pagosFiltros.usuarioId,
        tipo: this.pagosFiltros.tipo || undefined,
        fechaDesde: this.pagosFiltros.fechaDesde,
        fechaHasta: this.pagosFiltros.fechaHasta,
        search: search.length >= 2 ? search : undefined,
        sortBy: this.pagosSortBy,
        sortOrder: this.pagosSortOrder,
      })
      .subscribe({
        next: (res) => {
          this.pagos.set(res.data);
          this.pagosMeta.set({ ...res.meta, limit: this.pagosMeta().limit || res.meta.limit });
          this.pagosLoading = false;
        },
        error: () => {
          this.pagosLoading = false;
        },
      });
  }

  cargarEstadisticas(): void {
    this.estadisticasLoading = true;
    this.pagosSvc.getEstadisticas().subscribe({
      next: (res) => {
        this.estadisticas.set(res);
        this.estadisticasLoading = false;
      },
      error: () => {
        this.estadisticasLoading = false;
      },
    });
  }

  formatearFecha(s: string): string {
    return new Date(s).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatearMoneda(n: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(n);
  }

  cambiarFiltroTipo(v: 'JUNTA' | 'CARTA' | ''): void {
    this.pagosFiltros.tipo = v;
    this.pagosPage = 1;
    this.cargarPagos();
  }

  get fechaDesdeModel(): Date | null {
    const s = this.pagosFiltros.fechaDesde;
    return s ? new Date(s + 'T12:00:00') : null;
  }

  get fechaHastaModel(): Date | null {
    const s = this.pagosFiltros.fechaHasta;
    return s ? new Date(s + 'T12:00:00') : null;
  }

  cambiarFechaDesde(v: Date | string | null): void {
    this.pagosFiltros.fechaDesde = v instanceof Date ? v.toISOString().slice(0, 10) : (v || undefined);
    this.pagosPage = 1;
    this.cargarPagos();
  }

  cambiarFechaHasta(v: Date | string | null): void {
    this.pagosFiltros.fechaHasta = v instanceof Date ? v.toISOString().slice(0, 10) : (v || undefined);
    this.pagosPage = 1;
    this.cargarPagos();
  }

  limpiarFiltrosPagos(): void {
    this.pagosSearchControl.setValue('', { emitEvent: false });
    this.pagosFiltros = {};
    this.pagosPage = 1;
    this.cargarPagos();
  }

  ordenarPagosPor(campo: 'fechaPago' | 'monto' | 'tipo' | 'metodo' | 'consecutivo'): void {
    if (this.pagosSortBy === campo) {
      this.pagosSortOrder = this.pagosSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.pagosSortBy = campo;
      this.pagosSortOrder = campo === 'fechaPago' ? 'desc' : 'asc';
    }
    this.pagosPage = 1;
    this.cargarPagos();
  }

  iconoOrdenPagos(campo: string): string {
    if (this.pagosSortBy !== campo) return 'unfold_more';
    return this.pagosSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  onPagosPage(e: PageEvent): void {
    this.pagosPage = e.pageIndex + 1;
    this.pagosMeta.update((m) => ({ ...m, limit: e.pageSize }));
    this.cargarPagos();
  }

  nombreMes(m: number): string {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return meses[m - 1] || '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
