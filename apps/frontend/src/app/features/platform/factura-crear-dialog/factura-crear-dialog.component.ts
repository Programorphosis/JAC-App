import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { TipoFactura } from '../services/platform-facturas.service';

export interface FacturaCrearDialogData {
  juntaNombre: string;
}

export interface FacturaCrearDialogResult {
  monto: number;
  fechaVencimiento: string;
  tipo: TipoFactura;
  referenciaExterna?: string;
}

@Component({
  selector: 'app-factura-crear-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Crear factura manual</h2>
    <mat-dialog-content>
      <p class="text-sm text-gray-600 mb-4">{{ data.juntaNombre }}</p>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Monto (COP)</mat-label>
          <input matInput type="number" formControlName="monto" min="1" />
          @if (form.get('monto')?.hasError('required')) {
            <mat-error>El monto es requerido</mat-error>
          }
          @if (form.get('monto')?.hasError('min')) {
            <mat-error>El monto debe ser mayor a cero</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Fecha de vencimiento</mat-label>
          <input matInput type="date" formControlName="fechaVencimiento" />
          @if (form.get('fechaVencimiento')?.hasError('required')) {
            <mat-error>La fecha es requerida</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Tipo</mat-label>
          <mat-select formControlName="tipo">
            <mat-option value="MANUAL">Manual</mat-option>
            <mat-option value="AJUSTE">Ajuste</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Referencia externa (opcional)</mat-label>
          <input matInput formControlName="referenciaExterna" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="form.invalid"
        (click)="guardar()"
      >
        Crear factura
      </button>
    </mat-dialog-actions>
  `,
})
export class FacturaCrearDialogComponent {
  form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<FacturaCrearDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FacturaCrearDialogData
  ) {
    const hoy = new Date();
    const vencimiento = new Date(hoy);
    vencimiento.setMonth(vencimiento.getMonth() + 1);

    this.form = this.fb.group({
      monto: [null, [Validators.required, Validators.min(1)]],
      fechaVencimiento: [
        vencimiento.toISOString().slice(0, 10),
        Validators.required,
      ],
      tipo: ['MANUAL' as TipoFactura],
      referenciaExterna: [''],
    });
  }

  guardar(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.dialogRef.close({
      monto: Number(v.monto),
      fechaVencimiento: v.fechaVencimiento,
      tipo: v.tipo,
      referenciaExterna: v.referenciaExterna || undefined,
    } as FacturaCrearDialogResult);
  }
}
