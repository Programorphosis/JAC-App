import { Component, OnInit } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuariosService, TarifaItem, CreateTarifaBody } from '../../usuarios/services/usuarios.service';

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
    ReactiveFormsModule,
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
    private readonly fb: FormBuilder
  ) {
    this.form = this.fb.group({
      estadoLaboral: ['TRABAJANDO', Validators.required],
      valorMensual: [0, [Validators.required, Validators.min(1)]],
      fechaVigencia: ['', Validators.required],
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
    const v = this.form.value as CreateTarifaBody;
    v.fechaVigencia = v.fechaVigencia.split('T')[0];
    this.usuarios.crearTarifa(v).subscribe({
      next: () => {
        this.mostrandoForm = false;
        this.form.reset({ estadoLaboral: 'TRABAJANDO' });
        this.cargar();
      },
    });
  }

  cancelar(): void {
    this.mostrandoForm = false;
  }

  formatearMoneda(v: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(v);
  }

  formatearFecha(f: string): string {
    return new Date(f).toLocaleDateString('es-CO');
  }
}
