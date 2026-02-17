import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import type { JuntaUsuarioItem } from '../services/platform-juntas.service';

export interface AdminSelectorDialogData {
  titulo: string;
  usuarios: JuntaUsuarioItem[];
}

@Component({
  selector: 'app-admin-selector-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Nuevo administrador</mat-label>
        <mat-select [(ngModel)]="usuarioId" required>
          @for (u of data.usuarios; track u.id) {
            <mat-option [value]="u.id">
              {{ u.nombres }} {{ u.apellidos }} ({{ u.numeroDocumento }})
            </mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="!usuarioId"
        (click)="confirmar()"
      >
        Asignar
      </button>
    </mat-dialog-actions>
  `,
})
export class AdminSelectorDialogComponent {
  usuarioId: string | null = null;

  constructor(
    private readonly dialogRef: MatDialogRef<AdminSelectorDialogComponent, JuntaUsuarioItem | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: AdminSelectorDialogData
  ) {
    if (data.usuarios.length > 0) {
      this.usuarioId = data.usuarios[0].id;
    }
  }

  confirmar(): void {
    if (!this.usuarioId) return;
    const usuario = this.data.usuarios.find((u) => u.id === this.usuarioId);
    this.dialogRef.close(usuario ?? null);
  }
}
