import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

export interface CartaRechazarDialogData {
  usuarioNombre: string;
}

export interface CartaRechazarDialogResult {
  motivoRechazo: string | null;
}

@Component({
  selector: 'app-carta-rechazar-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Rechazar carta</h2>
    <mat-dialog-content>
      <p class="text-jac-text-secondary mb-4">
        ¿Rechazar la solicitud de carta de {{ data.usuarioNombre }}?
      </p>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Motivo (opcional)</mat-label>
        <textarea matInput [(ngModel)]="motivo" rows="3" maxlength="500" placeholder="Ej: Documentación incompleta"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(null)">Cancelar</button>
      <button mat-raised-button color="warn" (click)="confirmar()">
        Rechazar
      </button>
    </mat-dialog-actions>
  `,
})
export class CartaRechazarDialogComponent {
  motivo = '';

  constructor(
    public readonly dialogRef: MatDialogRef<CartaRechazarDialogComponent, CartaRechazarDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: CartaRechazarDialogData
  ) {}

  confirmar(): void {
    const m = this.motivo?.trim() || null;
    this.dialogRef.close({ motivoRechazo: m });
  }
}
