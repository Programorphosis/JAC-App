import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { CreateJuntaBody } from '../services/platform.service';

@Component({
  selector: 'app-junta-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
  ],
  templateUrl: './junta-form.component.html',
  styleUrl: './junta-form.component.scss',
})
export class JuntaFormComponent implements OnInit {
  @Input() modoEdicion = false;
  @Input() valoresIniciales?: { nombre: string; nit: string; montoCarta: number | null };
  @Output() guardar = new EventEmitter<CreateJuntaBody | { nombre: string; nit: string; montoCarta: number | null }>();

  form: FormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      nit: [''],
      montoCarta: [null as number | null],
      adminNombres: ['', Validators.required],
      adminApellidos: ['', Validators.required],
      adminTipoDocumento: ['CC', Validators.required],
      adminNumeroDocumento: ['', [Validators.required, Validators.minLength(5)]],
      adminTelefono: [''],
      adminDireccion: [''],
    });
  }

  ngOnInit(): void {
    if (this.modoEdicion && this.valoresIniciales) {
      this.form.patchValue({
        nombre: this.valoresIniciales.nombre,
        nit: this.valoresIniciales.nit || '',
        montoCarta: this.valoresIniciales.montoCarta,
      });
      this.form.get('adminNombres')?.clearValidators();
      this.form.get('adminApellidos')?.clearValidators();
      this.form.get('adminTipoDocumento')?.clearValidators();
      this.form.get('adminNumeroDocumento')?.clearValidators();
      this.form.get('adminNombres')?.updateValueAndValidity();
      this.form.get('adminApellidos')?.updateValueAndValidity();
      this.form.get('adminTipoDocumento')?.updateValueAndValidity();
      this.form.get('adminNumeroDocumento')?.updateValueAndValidity();
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    if (this.modoEdicion) {
      this.guardar.emit({
        nombre: v.nombre,
        nit: v.nit || undefined,
        montoCarta: v.montoCarta ?? undefined,
      });
    } else {
      this.guardar.emit({
        nombre: v.nombre,
        nit: v.nit || undefined,
        montoCarta: v.montoCarta ?? undefined,
        adminUser: {
          nombres: v.adminNombres,
          apellidos: v.adminApellidos,
          tipoDocumento: v.adminTipoDocumento,
          numeroDocumento: v.adminNumeroDocumento,
          telefono: v.adminTelefono || undefined,
          direccion: v.adminDireccion || undefined,
        },
      });
    }
  }
}
