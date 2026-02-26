import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { CreateJuntaBody } from '../services/platform-juntas.service';
import { PlatformPlanesService, Plan } from '../services/platform-planes.service';

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
    MatSlideToggleModule,
    MatCheckboxModule,
    DecimalPipe,
    RouterLink,
  ],
  templateUrl: './junta-form.component.html',
  styleUrl: './junta-form.component.scss',
})
export class JuntaFormComponent implements OnInit {
  @Input() modoEdicion = false;
  planes: Plan[] = [];
  @Input() valoresIniciales?: {
    nombre: string;
    nit: string;
    montoCarta: number | null;
    telefono?: string;
    email?: string;
    direccion?: string;
    ciudad?: string;
    departamento?: string;
    personeriaJuridica?: string | null;
    membreteUrl?: string | null;
    enMantenimiento?: boolean;
  };
  @Output() guardar = new EventEmitter<
    | CreateJuntaBody
    | {
        nombre: string;
        nit?: string;
        montoCarta?: number | null;
        telefono?: string | null;
        email?: string | null;
        direccion?: string | null;
        ciudad?: string | null;
        departamento?: string | null;
        personeriaJuridica?: string | null;
        membreteUrl?: string | null;
        enMantenimiento?: boolean;
      }
  >();

  form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly planesService: PlatformPlanesService
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      nit: [''],
      montoCarta: [null as number | null],
      planId: [''],
      diasPrueba: [null as number | null],
      telefono: [''],
      email: [''],
      direccion: [''],
      ciudad: [''],
      departamento: [''],
      personeriaJuridica: [''],
      membreteUrl: [''],
      enMantenimiento: [false],
      adminNombres: ['', Validators.required],
      adminApellidos: ['', Validators.required],
      adminTipoDocumento: ['CC', Validators.required],
      adminNumeroDocumento: ['', [Validators.required, Validators.minLength(5)]],
      adminTelefono: [''],
      adminDireccion: [''],
      aceptoTerminos: [false, Validators.requiredTrue],
      autorizoTratamientoDatos: [false, Validators.requiredTrue],
    });
  }

  ngOnInit(): void {
    if (!this.modoEdicion) {
      this.planesService.listar().subscribe({
        next: (p) => (this.planes = p),
      });
    }
    if (this.modoEdicion && this.valoresIniciales) {
      this.form.patchValue({
        nombre: this.valoresIniciales.nombre,
        nit: this.valoresIniciales.nit || '',
        montoCarta: this.valoresIniciales.montoCarta,
        telefono: this.valoresIniciales.telefono || '',
        email: this.valoresIniciales.email || '',
        direccion: this.valoresIniciales.direccion || '',
        ciudad: this.valoresIniciales.ciudad || '',
        departamento: this.valoresIniciales.departamento || '',
        personeriaJuridica: this.valoresIniciales.personeriaJuridica || '',
        membreteUrl: this.valoresIniciales.membreteUrl || '',
        enMantenimiento: this.valoresIniciales.enMantenimiento ?? false,
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
      // En edición no enviamos checkboxes legales
      this.guardar.emit({
        nombre: v.nombre,
        nit: v.nit || undefined,
        montoCarta: v.montoCarta ?? undefined,
        telefono: v.telefono || null,
        email: v.email || null,
        direccion: v.direccion || null,
        ciudad: v.ciudad || null,
        departamento: v.departamento || null,
        personeriaJuridica: v.personeriaJuridica || null,
        membreteUrl: v.membreteUrl || null,
        enMantenimiento: v.enMantenimiento ?? false,
      });
    } else {
      this.guardar.emit({
        nombre: v.nombre,
        nit: v.nit || undefined,
        montoCarta: v.montoCarta ?? undefined,
        planId: v.planId || undefined,
        diasPrueba: v.diasPrueba ?? undefined,
        aceptoTerminos: v.aceptoTerminos === true,
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
