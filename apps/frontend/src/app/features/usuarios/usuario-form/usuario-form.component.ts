import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CreateUserBody, UpdateUserBody } from '../services/usuarios.service';

/** Rol base: todos los usuarios de la junta son afiliados. */
const ROL_BASE = 'AFILIADO';
/** Roles operativos que el admin puede asignar además del base. */
const ROLES_OPERATIVOS = ['ADMIN', 'SECRETARIA', 'TESORERA', 'RECEPTOR_AGUA'];
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
  @Input() puedeEditarRoles = false;
  @Input() valoresIniciales?: Partial<{
    nombres: string;
    apellidos: string;
    telefono: string;
    direccion: string;
    activo: boolean;
    roles: string[];
  }>;
  @Output() guardar = new EventEmitter<CreateUserBody | UpdateUserBody>();

  readonly rolBase = ROL_BASE;
  readonly rolesOperativos = ROLES_OPERATIVOS;
  readonly tiposDoc = TIPOS_DOC;
  readonly estadosLaborales = [
    { value: 'NO_TRABAJANDO', label: 'No trabajando' },
    { value: 'TRABAJANDO', label: 'Trabajando' },
  ];
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
      rolesOperativos: [[] as string[]],
      estadoLaboralInicial: ['NO_TRABAJANDO'],
      activo: [true],
    });
  }

  ngOnInit(): void {
    if (this.modoEdicion && this.valoresIniciales) {
      const roles = this.valoresIniciales.roles ?? [];
      const rolesOperativos = roles.filter((r) => r !== ROL_BASE);
      this.form.patchValue({
        nombres: this.valoresIniciales.nombres,
        apellidos: this.valoresIniciales.apellidos,
        telefono: this.valoresIniciales.telefono || '',
        direccion: this.valoresIniciales.direccion || '',
        activo: this.valoresIniciales.activo ?? true,
        rolesOperativos,
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
      const payload: UpdateUserBody = {
        nombres: v.nombres,
        apellidos: v.apellidos,
        telefono: v.telefono || undefined,
        direccion: v.direccion || undefined,
        activo: v.activo,
      };
      if (this.puedeEditarRoles) {
        const op = Array.isArray(v.rolesOperativos) ? v.rolesOperativos : [];
        payload.roles = [ROL_BASE, ...op];
      }
      this.guardar.emit(payload);
    } else if (!this.modoEdicion) {
      this.guardar.emit({
        tipoDocumento: v.tipoDocumento,
        numeroDocumento: v.numeroDocumento,
        nombres: v.nombres,
        apellidos: v.apellidos,
        telefono: v.telefono || undefined,
        direccion: v.direccion || undefined,
        password: v.password,
        roles: [ROL_BASE, ...(Array.isArray(v.rolesOperativos) ? v.rolesOperativos : [])],
        estadoLaboralInicial: v.estadoLaboralInicial || 'NO_TRABAJANDO',
      });
    }
  }
}
