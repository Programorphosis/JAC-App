import { Component, Input, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuariosService, HistorialLaboralItem, CreateHistorialBody } from '../services/usuarios.service';

@Component({
  selector: 'app-usuario-historial',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
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
    private readonly fb: FormBuilder
  ) {
    this.form = this.fb.group({
      estado: ['TRABAJANDO', Validators.required],
      fechaInicio: ['', Validators.required],
      fechaFin: [''],
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
    const v = this.form.value as CreateHistorialBody;
    this.usuarios.crearHistorial(this.usuarioId, v).subscribe({
      next: () => {
        this.form.reset({ estado: 'TRABAJANDO' });
        this.cargar();
      },
    });
  }

  formatearFecha(f: string | null): string {
    if (!f) return 'Actual';
    return new Date(f).toLocaleDateString('es-CO');
  }
}
