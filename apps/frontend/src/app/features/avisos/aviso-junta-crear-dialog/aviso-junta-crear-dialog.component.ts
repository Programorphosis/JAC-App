import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AvisosJuntaService } from '../services/avisos-junta.service';
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';

/**
 * Diálogo para crear aviso de junta (admin/secretaria → afiliados).
 * Independiente de avisos plataforma.
 */
@Component({
  selector: 'app-aviso-junta-crear-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Nuevo aviso</h2>
    <mat-dialog-content>
      <p class="text-sm text-jac-text-secondary mb-4">
        Este aviso será visible para todos los afiliados de tu junta (reuniones, comunicados, etc.).
      </p>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Título</mat-label>
          <input matInput formControlName="titulo" maxlength="200" placeholder="Ej: Reunión el sábado 15" />
          @if (form.get('titulo')?.hasError('required')) {
            <mat-error>El título es requerido</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Contenido</mat-label>
          <textarea matInput formControlName="contenido" rows="4" placeholder="Detalles de la reunión, lugar, hora..."></textarea>
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
        {{ guardando ? 'Publicando...' : 'Publicar aviso' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class AvisoJuntaCrearDialogComponent {
  form: FormGroup;
  guardando = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<AvisoJuntaCrearDialogComponent>,
    private readonly avisos: AvisosJuntaService,
    private readonly snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      titulo: ['', Validators.required],
      contenido: ['', Validators.required],
    });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando) return;
    const v = this.form.value;
    this.guardando = true;
    this.avisos.crear({ titulo: v.titulo, contenido: v.contenido }).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        this.guardando = false;
        this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
      },
    });
  }
}
