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
import { DecimalPipe } from '@angular/common';
import type { Plan } from '../services/platform-planes.service';

export interface PlanSelectorDialogData {
  titulo: string;
  planes: Plan[];
  /** Plan actual (para excluir en cambiar plan) */
  planActualId?: string;
}

@Component({
  selector: 'app-plan-selector-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    DecimalPipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Plan</mat-label>
        <mat-select [(ngModel)]="planId" required>
          @for (p of planesDisponibles; track p.id) {
            <mat-option [value]="p.id">
              {{ p.nombre }} - {{ p.precioMensual | number }} COP/mes
              @if (p.diasPrueba > 0) {
                ({{ p.diasPrueba }} días prueba)
              }
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
        [disabled]="!planId"
        (click)="confirmar()"
      >
        Seleccionar
      </button>
    </mat-dialog-actions>
  `,
})
export class PlanSelectorDialogComponent {
  planId: string | null = null;
  planesDisponibles: Plan[];

  constructor(
    private readonly dialogRef: MatDialogRef<PlanSelectorDialogComponent, Plan | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: PlanSelectorDialogData
  ) {
    this.planesDisponibles = data.planActualId
      ? data.planes.filter((p) => p.id !== data.planActualId)
      : data.planes;
    if (this.planesDisponibles.length > 0 && !this.planId) {
      this.planId = this.planesDisponibles[0].id;
    }
  }

  confirmar(): void {
    if (!this.planId) return;
    const plan = this.planesDisponibles.find((p) => p.id === this.planId);
    this.dialogRef.close(plan ?? null);
  }
}
