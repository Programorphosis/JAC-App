import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  /** Título del diálogo */
  titulo: string;
  /** Mensaje o descripción de la acción */
  mensaje: string;
  /** Texto del botón de confirmar (default: "Confirmar") */
  textoConfirmar?: string;
  /** Texto del botón de cancelar (default: "Cancelar") */
  textoCancelar?: string;
  /** Si true, el botón confirmar usa color="warn" (default: false) */
  peligroso?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content>
      <p class="text-gray-700">{{ data.mensaje }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">
        {{ data.textoCancelar ?? 'Cancelar' }}
      </button>
      <button
        mat-raised-button
        [color]="data.peligroso ? 'warn' : 'primary'"
        [mat-dialog-close]="true"
      >
        {{ data.textoConfirmar ?? 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  constructor(
    public readonly dialogRef: MatDialogRef<ConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ConfirmDialogData
  ) {}
}
