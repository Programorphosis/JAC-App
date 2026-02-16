import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { CreateRequisitoTipoBody, RequisitoTipoItem } from '../services/requisitos.service';
import { UsuariosService, UsuarioListItem } from '../../usuarios/services/usuarios.service';
import { formatearNombre } from '../../../shared/utils/formatear-nombre.util';

@Component({
  selector: 'app-requisito-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSelectModule,
  ],
  templateUrl: './requisito-form.component.html',
  styleUrl: './requisito-form.component.scss',
})
export class RequisitoFormComponent implements OnInit {
  @Input() valoresIniciales?: RequisitoTipoItem;
  @Output() guardar = new EventEmitter<CreateRequisitoTipoBody>();
  @Output() cancelar = new EventEmitter<void>();

  form: FormGroup;
  esEdicion = false;
  usuarios: UsuarioListItem[] = [];
  loadingUsuarios = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly usuariosSvc: UsuariosService,
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      modificadorId: [null as string | null],
      tieneCorteAutomatico: [true],
    });
  }

  ngOnInit(): void {
    this.esEdicion = !!this.valoresIniciales;
    if (this.valoresIniciales) {
      this.form.patchValue({
        nombre: this.valoresIniciales.nombre,
        modificadorId: this.valoresIniciales.modificadorId ?? null,
        tieneCorteAutomatico: this.valoresIniciales.tieneCorteAutomatico,
      });
    }
    this.loadingUsuarios = true;
    this.usuariosSvc.listar(1, 200).subscribe({
      next: (res) => {
        this.usuarios = res.data;
        this.loadingUsuarios = false;
      },
      error: () => (this.loadingUsuarios = false),
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.guardar.emit({
      nombre: v.nombre,
      modificadorId: this.esEdicion ? v.modificadorId : (v.modificadorId || undefined),
      tieneCorteAutomatico: v.tieneCorteAutomatico,
    });
  }

  get titulo(): string {
    return this.esEdicion ? 'Editar requisito' : 'Nuevo requisito';
  }

  get textoBoton(): string {
    return this.esEdicion ? 'Guardar' : 'Crear';
  }

  onCancelar(): void {
    this.cancelar.emit();
  }

  nombreUsuario(u: UsuarioListItem): string {
    return `${formatearNombre(u.nombres)} ${formatearNombre(u.apellidos)} (${u.tipoDocumento} ${u.numeroDocumento})`;
  }
}
