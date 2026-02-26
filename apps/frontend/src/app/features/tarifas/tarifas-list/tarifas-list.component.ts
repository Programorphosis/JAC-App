import { Component, OnInit, computed, signal } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';
import { AppCanDirective } from '../../../core/auth/app-can.directive';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuariosService, TarifaItem, CreateTarifaBody } from '../../usuarios/services/usuarios.service';
import { FormatearFechaPipe } from '../../../shared/pipes/formatear-fecha.pipe';

@Component({
  selector: 'app-tarifas-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    AppCanDirective,
    FormatearFechaPipe,
  ],
  templateUrl: './tarifas-list.component.html',
  styleUrl: './tarifas-list.component.scss',
})
export class TarifasListComponent implements OnInit {
  displayedColumns = ['estadoLaboral', 'valorMensual', 'fechaVigencia', 'acciones'];
  dataSource = new MatTableDataSource<TarifaItem>([]);
  tarifas = signal<TarifaItem[]>([]);
  loading = false;
  mostrandoForm = false;
  /** Tarifa en edición: prellenar form y al guardar crear nueva con fechaVigencia=hoy */
  editarTarifa = signal<TarifaItem | null>(null);
  form: FormGroup;

  /** IDs de tarifas vigentes (mayor fechaVigencia <= fin de mes actual por estadoLaboral) */
  readonly vigenteIds = computed(() => {
    const list = this.tarifas();
    const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    const vigentes = new Set<string>();
    for (const estado of ['TRABAJANDO', 'NO_TRABAJANDO']) {
      const delEstado = list.filter((t) => t.estadoLaboral === estado);
      const enRango = delEstado.filter((t) => new Date(t.fechaVigencia) <= lastDay);
      const maxFecha = enRango.reduce<Date | null>((m, t) => {
        const d = new Date(t.fechaVigencia);
        return !m || d > m ? d : m;
      }, null);
      if (maxFecha) {
        const elegida = enRango.find((t) => new Date(t.fechaVigencia).getTime() === maxFecha.getTime());
        if (elegida) vigentes.add(elegida.id);
      }
    }
    return vigentes;
  });

  constructor(
    private readonly usuarios: UsuariosService,
    private readonly fb: FormBuilder,
    private readonly snackBar: MatSnackBar,
    readonly auth: AuthService
  ) {
    this.form = this.fb.group({
      estadoLaboral: ['TRABAJANDO', Validators.required],
      valorMensual: [0, [Validators.required, Validators.min(1)]],
      fechaVigencia: [null as Date | null, Validators.required],
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.usuarios.getTarifas().subscribe({
      next: (res) => {
        const data = res.data || [];
        this.tarifas.set(data);
        this.dataSource.data = data;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  crear(): void {
    this.editarTarifa.set(null);
    this.mostrandoForm = true;
    this.form.reset({ estadoLaboral: 'TRABAJANDO', valorMensual: 0, fechaVigencia: new Date() });
  }

  editar(t: TarifaItem): void {
    this.editarTarifa.set(t);
    this.mostrandoForm = true;
    this.form.reset({
      estadoLaboral: t.estadoLaboral,
      valorMensual: t.valorMensual,
      fechaVigencia: new Date(),
    });
    this.form.get('estadoLaboral')?.disable();
  }

  esVigente(t: TarifaItem): boolean {
    return this.vigenteIds().has(t.id);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const fechaVal = raw.fechaVigencia;
    const fechaStr = fechaVal instanceof Date
      ? fechaVal.toISOString().slice(0, 10)
      : String(fechaVal ?? '').split('T')[0];
    const v: CreateTarifaBody = {
      estadoLaboral: raw.estadoLaboral,
      valorMensual: raw.valorMensual,
      fechaVigencia: fechaStr,
    };
    const esEdicion = this.editarTarifa() !== null;
    this.usuarios.crearTarifa(v).subscribe({
      next: () => {
        this.mostrandoForm = false;
        this.editarTarifa.set(null);
        this.form.reset({ estadoLaboral: 'TRABAJANDO', valorMensual: 0, fechaVigencia: null });
        this.form.get('estadoLaboral')?.enable();
        this.cargar();
        if (esEdicion) {
          this.snackBar.open(
            'Se ha creado una nueva tarifa vigente desde hoy. La tarifa anterior seguirá aplicando a los meses pasados.',
            'Cerrar',
            { duration: 6000 }
          );
        }
      },
    });
  }

  cancelar(): void {
    this.mostrandoForm = false;
    this.editarTarifa.set(null);
    this.form.reset({ estadoLaboral: 'TRABAJANDO', valorMensual: 0, fechaVigencia: null });
    this.form.get('estadoLaboral')?.enable();
  }

  formatearMoneda(v: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(v);
  }

}
