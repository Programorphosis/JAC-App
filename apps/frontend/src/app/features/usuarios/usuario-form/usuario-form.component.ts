import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { RouterLink } from '@angular/router';
import { CreateUserBody, UpdateUserBody } from '../services/usuarios.service';
import {
  DEPARTAMENTOS_CIUDADES,
  formatLugarExpedicion,
  parseLugarExpedicion,
} from '../../../shared/data/colombia-data';

/** Rol base: todos los usuarios de la junta son afiliados. */
const ROL_BASE = 'AFILIADO';
/** Roles operativos que el admin puede asignar además del base. */
const ROLES_OPERATIVOS = ['ADMIN', 'SECRETARIA', 'TESORERA', 'FISCAL', 'RECEPTOR_AGUA'];
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
    MatDatepickerModule,
    MatNativeDateModule,
    RouterLink,
  ],
  templateUrl: './usuario-form.component.html',
  styleUrl: './usuario-form.component.scss',
})
export class UsuarioFormComponent implements OnInit {
  @Input() modoEdicion = false;
  @Input() puedeEditarRoles = false;
  @Input()     valoresIniciales?: Partial<{
    nombres: string;
    apellidos: string;
    telefono: string;
    direccion: string;
    lugarExpedicion: string | null;
    activo: boolean;
    roles: string[];
    fechaAfiliacion: string | null;
    folio: number | null;
    numeral: number | null;
  }>;
  @Output() guardar = new EventEmitter<CreateUserBody | UpdateUserBody>();

  readonly rolBase = ROL_BASE;
  readonly rolesOperativos = ROLES_OPERATIVOS;
  readonly tiposDoc = TIPOS_DOC;
  readonly departamentosCiudades = DEPARTAMENTOS_CIUDADES;
  ciudadesLugarExpedicion: string[] = [];
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
      departamentoLugarExpedicion: [''],
      ciudadLugarExpedicion: [''],
      password: ['', [Validators.minLength(6)]], // opcional: si vacío, backend usa cédula
      rolesOperativos: [[] as string[]],
      estadoLaboralInicial: ['NO_TRABAJANDO'],
      activo: [true],
      fechaAfiliacion: [null as Date | null],
      folio: [null as number | null],
      numeral: [null as number | null],
      autorizoTratamientoDatos: [false, Validators.requiredTrue],
    });
  }

  ngOnInit(): void {
    this.form.get('departamentoLugarExpedicion')?.valueChanges.subscribe((dep) => {
      const dept = this.departamentosCiudades.find((d) => d.departamento === dep);
      this.ciudadesLugarExpedicion = dept?.ciudades ?? [];
      if (!dep) {
        this.form.patchValue({ ciudadLugarExpedicion: '' }, { emitEvent: false });
      }
    });

    if (this.modoEdicion && this.valoresIniciales) {
      const roles = this.valoresIniciales.roles ?? [];
      const rolesOperativos = roles.filter((r) => r !== ROL_BASE);
      const fa = this.valoresIniciales.fechaAfiliacion;
      const parsed = parseLugarExpedicion(this.valoresIniciales.lugarExpedicion ?? '');
      this.form.patchValue({
        nombres: this.valoresIniciales.nombres,
        apellidos: this.valoresIniciales.apellidos,
        telefono: this.valoresIniciales.telefono || '',
        direccion: this.valoresIniciales.direccion || '',
        departamentoLugarExpedicion: parsed?.departamento ?? '',
        ciudadLugarExpedicion: parsed?.ciudad ?? '',
        activo: this.valoresIniciales.activo ?? true,
        rolesOperativos,
        fechaAfiliacion: fa ? new Date(fa + 'T12:00:00') : null,
        folio: this.valoresIniciales.folio ?? null,
        numeral: this.valoresIniciales.numeral ?? null,
      });
      if (parsed?.departamento) {
        const dept = this.departamentosCiudades.find((d) => d.departamento === parsed.departamento);
        this.ciudadesLugarExpedicion = dept?.ciudades ?? [];
      }
      this.form.get('tipoDocumento')?.disable();
      this.form.get('numeroDocumento')?.disable();
      this.form.get('password')?.clearValidators();
      this.form.get('password')?.updateValueAndValidity();
      this.form.get('autorizoTratamientoDatos')?.clearValidators();
      this.form.get('autorizoTratamientoDatos')?.updateValueAndValidity();
    }
  }

  private formatFechaAfiliacion(val: Date | null): string | null {
    if (!val || !(val instanceof Date)) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const lugarExpedicion = formatLugarExpedicion(v.ciudadLugarExpedicion, v.departamentoLugarExpedicion) || null;
    if (this.modoEdicion) {
      const payload: UpdateUserBody = {
        nombres: v.nombres,
        apellidos: v.apellidos,
        telefono: v.telefono || undefined,
        direccion: v.direccion || undefined,
        lugarExpedicion,
        activo: v.activo,
        fechaAfiliacion: this.formatFechaAfiliacion(v.fechaAfiliacion),
        folio: v.folio ?? null,
        numeral: v.numeral ?? null,
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
        lugarExpedicion: lugarExpedicion || undefined,
        password: v.password?.trim() || undefined,
        roles: [ROL_BASE, ...(Array.isArray(v.rolesOperativos) ? v.rolesOperativos : [])],
        estadoLaboralInicial: v.estadoLaboralInicial || 'NO_TRABAJANDO',
        fechaAfiliacion: this.formatFechaAfiliacion(v.fechaAfiliacion) ?? undefined,
        folio: v.folio ?? undefined,
        numeral: v.numeral ?? undefined,
      });
    }
  }
}
