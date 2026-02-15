import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmarEliminarRequisitoData {
  nombre: string;
}

@Component({
  selector: 'app-confirmar-eliminar-requisito-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Eliminar requisito</h2>
    <mat-dialog-content>
      ¿Está seguro de eliminar el requisito "{{ data.nombre }}"?
      Se eliminarán también los estados e historial asociados.
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">
        Eliminar
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmarEliminarRequisitoDialogComponent {
  constructor(
    public readonly dialogRef: MatDialogRef<ConfirmarEliminarRequisitoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmarEliminarRequisitoData,
  ) {}
}
