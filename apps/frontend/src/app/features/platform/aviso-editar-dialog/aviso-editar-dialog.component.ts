import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PlatformAvisosService, AvisoPlataforma, AlcanceAviso } from '../services/platform-avisos.service';
import { PlatformJuntasService, JuntaListItem } from '../services/platform-juntas.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';

export interface AvisoEditarDialogData {
  aviso: AvisoPlataforma;
}

const ALCANCES: { value: AlcanceAviso; label: string }[] = [
  { value: 'PLATAFORMA', label: 'Solo administradores de plataforma' },
  { value: 'TODAS_JUNTAS', label: 'Todas las juntas' },
  { value: 'JUNTA_ESPECIFICA', label: 'Junta específica' },
];

/**
 * PA-9: Diálogo para editar aviso de plataforma.
 */
@Component({
  selector: 'app-aviso-editar-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Editar aviso</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Destinatarios</mat-label>
          <mat-select formControlName="alcance">
            @for (a of alcances; track a.value) {
              <mat-option [value]="a.value">{{ a.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        @if (form.get('alcance')?.value === 'JUNTA_ESPECIFICA') {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Junta</mat-label>
            <mat-select formControlName="juntaId" placeholder="Seleccione una junta">
              @for (j of juntas; track j.id) {
                <mat-option [value]="j.id">{{ j.nombre }}</mat-option>
              }
            </mat-select>
            @if (form.get('juntaId')?.hasError('required')) {
              <mat-error>Debe seleccionar una junta</mat-error>
            }
          </mat-form-field>
        }
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Título</mat-label>
          <input matInput formControlName="titulo" maxlength="200" />
          @if (form.get('titulo')?.hasError('required')) {
            <mat-error>El título es requerido</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Contenido</mat-label>
          <textarea matInput formControlName="contenido" rows="4"></textarea>
          @if (form.get('contenido')?.hasError('required')) {
            <mat-error>El contenido es requerido</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="form.invalid || guardando"
        (click)="guardar()"
      >
        {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class AvisoEditarDialogComponent implements OnInit {
  form: FormGroup;
  guardando = false;
  alcances = ALCANCES;
  juntas: JuntaListItem[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<AvisoEditarDialogComponent, boolean>,
    private readonly avisos: PlatformAvisosService,
    private readonly juntasSvc: PlatformJuntasService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public readonly data: AvisoEditarDialogData
  ) {
    const a = data.aviso;
    this.form = this.fb.group({
      alcance: [a.alcance ?? 'TODAS_JUNTAS', Validators.required],
      juntaId: [a.juntaId ?? null],
      titulo: [a.titulo, Validators.required],
      contenido: [a.contenido, Validators.required],
    });
  }

  ngOnInit(): void {
    this.juntasSvc.listar(1, 200, true).subscribe({
      next: (r) => (this.juntas = r.data),
    });
    this.form.get('alcance')?.valueChanges.subscribe((alcance) => {
      const juntaId = this.form.get('juntaId');
      if (alcance === 'JUNTA_ESPECIFICA') {
        juntaId?.setValidators(Validators.required);
      } else {
        juntaId?.clearValidators();
        juntaId?.setValue(null);
      }
      juntaId?.updateValueAndValidity();
    });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando) return;
    const v = this.form.value;
    const dto = {
      titulo: v.titulo,
      contenido: v.contenido,
      alcance: v.alcance,
      ...(v.alcance === 'JUNTA_ESPECIFICA' && v.juntaId && { juntaId: v.juntaId }),
      ...(v.alcance !== 'JUNTA_ESPECIFICA' && { juntaId: null }),
    };
    this.guardando = true;
    this.avisos.actualizar(this.data.aviso.id, dto).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        this.guardando = false;
        this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
      },
    });
  }
}
