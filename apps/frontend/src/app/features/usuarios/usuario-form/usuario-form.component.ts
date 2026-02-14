import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CreateUserBody, UpdateUserBody } from '../services/usuarios.service';

const ROLES = ['ADMIN', 'SECRETARIA', 'TESORERA', 'RECEPTOR_AGUA', 'CIUDADANO'];
const TIPOS_DOC = ['CC', 'CE', 'TI', 'PA'];

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
  ],
  templateUrl: './usuario-form.component.html',
  styleUrl: './usuario-form.component.scss',
})
export class UsuarioFormComponent implements OnInit {
  @Input() modoEdicion = false;
  @Input() valoresIniciales?: Partial<{
    nombres: string;
    apellidos: string;
    telefono: string;
    direccion: string;
    activo: boolean;
  }>;
  @Output() guardar = new EventEmitter<CreateUserBody | UpdateUserBody>();

  readonly roles = ROLES;
  readonly tiposDoc = TIPOS_DOC;
  form: FormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      tipoDocumento: ['CC', Validators.required],
      numeroDocumento: ['', [Validators.required, Validators.minLength(5)]],
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      telefono: [''],
      direccion: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      roles: [['CIUDADANO']],
      activo: [true],
    });
  }

  ngOnInit(): void {
    if (this.modoEdicion && this.valoresIniciales) {
      this.form.patchValue({
        nombres: this.valoresIniciales.nombres,
        apellidos: this.valoresIniciales.apellidos,
        telefono: this.valoresIniciales.telefono || '',
        direccion: this.valoresIniciales.direccion || '',
        activo: this.valoresIniciales.activo ?? true,
      });
      this.form.get('tipoDocumento')?.disable();
      this.form.get('numeroDocumento')?.disable();
      this.form.get('password')?.clearValidators();
      this.form.get('password')?.updateValueAndValidity();
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    if (this.modoEdicion) {
      this.guardar.emit({
        nombres: v.nombres,
        apellidos: v.apellidos,
        telefono: v.telefono || undefined,
        direccion: v.direccion || undefined,
        activo: v.activo,
      });
    } else {
      this.guardar.emit({
        tipoDocumento: v.tipoDocumento,
        numeroDocumento: v.numeroDocumento,
        nombres: v.nombres,
        apellidos: v.apellidos,
        telefono: v.telefono || undefined,
        direccion: v.direccion || undefined,
        password: v.password,
        roles: Array.isArray(v.roles) ? v.roles : ['CIUDADANO'],
      });
    }
  }
}
