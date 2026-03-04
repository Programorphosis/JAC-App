import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AvisosJuntaService, AvisoJunta } from '../services/avisos-junta.service';
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';

export interface AvisoJuntaEditarDialogData {
  aviso: AvisoJunta;
}

/**
 * Diálogo para editar aviso de junta.
 */
@Component({
  selector: 'app-aviso-junta-editar-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Editar aviso</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
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
        <mat-slide-toggle formControlName="activo" class="mb-2">
          Aviso visible para afiliados
        </mat-slide-toggle>
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
        {{ guardando ? 'Guardando...' : 'Guardar' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class AvisoJuntaEditarDialogComponent {
  form: FormGroup;
  guardando = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<AvisoJuntaEditarDialogComponent, boolean>,
    private readonly avisos: AvisosJuntaService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public readonly data: AvisoJuntaEditarDialogData
  ) {
    const a = data.aviso;
    this.form = this.fb.group({
      titulo: [a.titulo, Validators.required],
      contenido: [a.contenido, Validators.required],
      activo: [a.activo !== false],
    });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando) return;
    const v = this.form.value;
    const dto = {
      titulo: v.titulo,
      contenido: v.contenido,
      activo: v.activo,
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
