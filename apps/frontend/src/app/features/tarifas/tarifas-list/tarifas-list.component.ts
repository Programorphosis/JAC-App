import { Component, OnInit } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
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
  displayedColumns = ['estadoLaboral', 'valorMensual', 'fechaVigencia'];
  dataSource = new MatTableDataSource<TarifaItem>([]);
  loading = false;
  mostrandoForm = false;
  form: FormGroup;

  constructor(
    private readonly usuarios: UsuariosService,
    private readonly fb: FormBuilder,
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
        this.dataSource.data = res.data || [];
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  crear(): void {
    this.mostrandoForm = true;
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const raw = this.form.value;
    const fechaVal = raw.fechaVigencia;
    const fechaStr = fechaVal instanceof Date
      ? fechaVal.toISOString().slice(0, 10)
      : String(fechaVal ?? '').split('T')[0];
    const v: CreateTarifaBody = {
      estadoLaboral: raw.estadoLaboral,
      valorMensual: raw.valorMensual,
      fechaVigencia: fechaStr,
    };
    this.usuarios.crearTarifa(v).subscribe({
      next: () => {
        this.mostrandoForm = false;
        this.form.reset({ estadoLaboral: 'TRABAJANDO', valorMensual: 0, fechaVigencia: null });
        this.cargar();
      },
    });
  }

  cancelar(): void {
    this.mostrandoForm = false;
    this.form.reset({ estadoLaboral: 'TRABAJANDO', valorMensual: 0, fechaVigencia: null });
  }

  formatearMoneda(v: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(v);
  }

}
