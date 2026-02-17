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
import type { MetodoPagoFactura } from '../services/platform-facturas.service';

export interface PagoRegistrarDialogData {
  facturaId: string;
  montoTotal: number;
  montoPagado: number;
  montoPendiente: number;
}

export interface PagoRegistrarDialogResult {
  monto: number;
  metodo: MetodoPagoFactura;
  referencia?: string;
  referenciaExterna?: string;
}

@Component({
  selector: 'app-pago-registrar-dialog',
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
    <h2 mat-dialog-title>Registrar pago</h2>
    <mat-dialog-content>
      <p class="text-sm text-gray-600 mb-4">
        Total: {{ data.montoTotal | number }} COP · Pagado: {{ data.montoPagado | number }} COP ·
        Pendiente: {{ data.montoPendiente | number }} COP
      </p>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Monto (COP)</mat-label>
          <input matInput type="number" formControlName="monto" [max]="data.montoPendiente" />
          @if (form.get('monto')?.hasError('required')) {
            <mat-error>El monto es requerido</mat-error>
          }
          @if (form.get('monto')?.hasError('min')) {
            <mat-error>El monto debe ser mayor a cero</mat-error>
          }
          @if (form.get('monto')?.hasError('max')) {
            <mat-error>No puede exceder {{ data.montoPendiente | number }} COP</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Método de pago</mat-label>
          <mat-select formControlName="metodo">
            <mat-option value="EFECTIVO">Efectivo</mat-option>
            <mat-option value="TRANSFERENCIA">Transferencia</mat-option>
            <mat-option value="ONLINE">Online</mat-option>
            <mat-option value="CHEQUE">Cheque</mat-option>
            <mat-option value="OTRO">Otro</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Referencia (opcional)</mat-label>
          <input matInput formControlName="referencia" />
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
        Registrar pago
      </button>
    </mat-dialog-actions>
  `,
})
export class PagoRegistrarDialogComponent {
  form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<PagoRegistrarDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PagoRegistrarDialogData
  ) {
    this.form = this.fb.group({
      monto: [
        data.montoPendiente,
        [
          Validators.required,
          Validators.min(1),
          Validators.max(data.montoPendiente),
        ],
      ],
      metodo: ['TRANSFERENCIA' as MetodoPagoFactura],
      referencia: [''],
      referenciaExterna: [''],
    });
  }

  guardar(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.dialogRef.close({
      monto: Number(v.monto),
      metodo: v.metodo,
      referencia: v.referencia || undefined,
      referenciaExterna: v.referenciaExterna || undefined,
    } as PagoRegistrarDialogResult);
  }
}
