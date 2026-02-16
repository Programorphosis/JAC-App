import { Component, Input, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuariosService, HistorialLaboralItem, CreateHistorialBody } from '../services/usuarios.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AppCanDirective } from '../../../core/auth/app-can.directive';

@Component({
  selector: 'app-usuario-historial',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    ReactiveFormsModule,
    NgClass,
    AppCanDirective,
  ],
  templateUrl: './usuario-historial.component.html',
  styleUrl: './usuario-historial.component.scss',
})
export class UsuarioHistorialComponent implements OnInit {
  @Input() usuarioId!: string;
  items: HistorialLaboralItem[] = [];
  loading = false;
  form: FormGroup;

  constructor(
    private readonly usuarios: UsuariosService,
    private readonly fb: FormBuilder,
    readonly auth: AuthService
  ) {
    this.form = this.fb.group({
      estado: ['TRABAJANDO', Validators.required],
      fechaInicio: [null as Date | null, Validators.required],
      fechaFin: [null as Date | null],
    });
  }

  ngOnInit(): void {
    if (this.usuarioId) {
      this.cargar();
    }
  }

  cargar(): void {
    this.loading = true;
    this.usuarios.getHistorial(this.usuarioId).subscribe({
      next: (res: { data: HistorialLaboralItem[] }) => {
        this.items = res.data || [];
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const fechaInicio = v.fechaInicio instanceof Date ? v.fechaInicio.toISOString().slice(0, 10) : '';
    const fechaFin = v.fechaFin instanceof Date ? v.fechaFin.toISOString().slice(0, 10) : undefined;
    const body: CreateHistorialBody = {
      estado: v.estado,
      fechaInicio,
      fechaFin: fechaFin || undefined,
    };
    this.usuarios.crearHistorial(this.usuarioId, body).subscribe({
      next: () => {
        this.form.reset({ estado: 'TRABAJANDO', fechaInicio: null, fechaFin: null });
        this.cargar();
      },
    });
  }


  formatearFecha(f: string | null): string {
    if (!f) return 'Actual';
    return new Date(f).toLocaleDateString('es-CO');
  }
}
