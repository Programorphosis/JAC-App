import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
import { MiJuntaService } from '../../mi-junta/services/mi-junta.service';
import { AuthService } from '../../../core/auth/auth.service';
import { getApiErrorMessage, getApiErrorCode } from '../../../shared/utils/api-error.util';
import { formatearNombre } from '../../../shared/utils/formatear-nombre.util';
import { FormatearNombrePipe } from '../../../shared/pipes/formatear-nombre.pipe';
import { FormatearFechaHoraPipe } from '../../../shared/pipes/formatear-fecha-hora.pipe';

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
    RouterLink,
    FormatearNombrePipe,
    FormatearFechaHoraPipe,
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
  exportandoPagos = false;
  pagosPage = 1;
  pagosFiltros: { usuarioId?: string; tipo?: 'JUNTA' | 'CARTA' | ''; fechaDesde?: string; fechaHasta?: string } = {};
  pagosSearchControl = new FormControl('', { nonNullable: true });
  pagosSortBy: 'fechaPago' | 'monto' | 'tipo' | 'metodo' | 'consecutivo' = 'fechaPago';
  pagosSortOrder: 'asc' | 'desc' = 'desc';

  private readonly destroy$ = new Subject<void>();

  estadisticas = signal<EstadisticasPagos | null>(null);
  estadisticasLoading = false;
  tieneTarifas = signal<boolean | null>(null);

  readonly puedeVerListado = computed(() => this.auth.can(this.auth.permissions.PAGOS_VER));
  readonly displayedColumns = ['fechaPago', 'tipo', 'metodo', 'monto', 'usuarioNombre', 'consecutivo', 'registradoPorNombre'];

  /** Índice de la pestaña activa. Registrar = 1 si hay Dashboard, 0 si no. */
  selectedTabIndex = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly pagosSvc: PagosService,
    private readonly usuariosSvc: UsuariosService,
    private readonly miJunta: MiJuntaService,
    readonly auth: AuthService,
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
    if (this.auth.can(this.auth.permissions.PAGOS_GESTIONAR) && this.auth.currentUser()?.juntaId) {
      this.miJunta.obtener().subscribe({
        next: (j) => this.tieneTarifas.set(j.tieneTarifas),
      });
    }
    this.route.queryParams.subscribe((params) => {
      const puedeRegistrar = this.auth.can(this.auth.permissions.PAGOS_GESTIONAR);
      if (params['tab'] === 'registrar' && puedeRegistrar) {
        this.selectedTabIndex = this.puedeVerListado() ? 1 : 0;
      } else if (params['tab'] === 'listado' && this.puedeVerListado()) {
        this.selectedTabIndex = puedeRegistrar ? 2 : 1;
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
          this.snackBar.open(this.getMensajeErrorPago(err), 'Cerrar', { duration: 6000 });
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
          this.snackBar.open(this.getMensajeErrorPago(err), 'Cerrar', { duration: 6000 });
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

  exportarPagos(): void {
    this.exportandoPagos = true;
    const params: Parameters<PagosService['exportarCsv']>[0] = {
      tipo: this.pagosFiltros.tipo || undefined,
      fechaDesde: this.pagosFiltros.fechaDesde,
      fechaHasta: this.pagosFiltros.fechaHasta,
      search: this.pagosSearchControl.value.trim().length >= 2 ? this.pagosSearchControl.value.trim() : undefined,
    };
    if (this.pagosFiltros.usuarioId) params.usuarioId = this.pagosFiltros.usuarioId;
    this.pagosSvc.exportarCsv(params).subscribe({
      next: (res) => {
        this.exportandoPagos = false;
        const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.filename;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.exportandoPagos = false;
        this.snackBar.open('Error al exportar pagos', 'Cerrar', { duration: 3000 });
      },
    });
  }

  /** Devuelve un mensaje claro para errores de pago según el código de dominio. */
  getMensajeErrorPago(err: unknown): string {
    const code = getApiErrorCode(err);
    const mensajes: Record<string, string> = {
      DEUDA_CERO: 'Este usuario no tiene deuda pendiente. No hay nada que pagar.',
      MONTO_INCORRECTO: 'El monto enviado no coincide con la deuda calculada. Recargue e intente de nuevo.',
      PAGO_DUPLICADO: 'Este pago ya fue registrado anteriormente (referencia duplicada).',
      PAGO_CARTA_PENDIENTE: 'Ya existe un pago de carta pendiente de usar. No se puede registrar otro hasta que se expida o rechace la carta.',
      USUARIO_INACTIVO: 'El usuario está inactivo y no puede realizar pagos.',
      SIN_HISTORIAL_LABORAL: 'El usuario no tiene historial laboral configurado. Contacte al administrador.',
      SIN_TARIFA_VIGENTE: 'La junta no tiene tarifas configuradas para este período.',
      WOMPI_NO_CONFIGURADO: 'Los pagos online no están configurados para esta junta.',
      SUSCRIPCION_VENCIDA: 'La suscripción de la junta ha vencido. Contacte al administrador de la plataforma.',
    };
    return (code && mensajes[code]) ? mensajes[code] : getApiErrorMessage(err);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
