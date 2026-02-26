import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';

export interface ConfirmarCambioPlanDialogData {
  planOrigen: string;
  planDestino: string;
  esUpgrade: boolean;
  /** Cambio de periodo (mensual→anual) mismo plan, requiere pago */
  esCambioPeriodo?: boolean;
  tieneOverrides: boolean;
  /** Solo platform admin: mostrar opción de forzar downgrade inmediato */
  esPlatformAdmin?: boolean;
}

export type ConfirmarCambioPlanResult = boolean | { confirmado: true; forzarDowngrade?: boolean };

/**
 * Diálogo de confirmación basado en las reglas de upgrade/downgrade.
 * - Upgrade: nueva fecha de vencimiento, limpieza de overrides, pago obligatorio.
 * - Cambio periodo (mensual→anual): pago obligatorio.
 * - Downgrade: efectivo al final del ciclo actual, sin pago.
 */
@Component({
  selector: 'app-confirmar-cambio-plan-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatCheckboxModule, FormsModule],
  template: `
    <h2 mat-dialog-title>
      {{ data.esUpgrade ? (data.esCambioPeriodo ? 'Cambiar a facturación anual' : 'Confirmar upgrade') : 'Confirmar downgrade' }}
    </h2>
    <mat-dialog-content class="min-w-[360px]">
      @if (data.esUpgrade) {
        <p class="text-jac-text-secondary mb-3">
          @if (data.esCambioPeriodo) {
            Va a cambiar la facturación de <strong>{{ data.planOrigen }}</strong> de mensual a anual.
          } @else {
            Va a cambiar de <strong>{{ data.planOrigen }}</strong> a
            <strong>{{ data.planDestino }}</strong> (plan superior).
          }
        </p>
        <ul class="list-disc list-inside text-sm text-jac-text-secondary space-y-1 mb-2">
          @if (data.esCambioPeriodo) {
            <li>Requiere pago inmediato del periodo anual</li>
            <li>Nueva fecha de vencimiento: hoy + 1 año</li>
          } @else {
            <li>Requiere pago inmediato</li>
            <li>Nueva fecha de vencimiento según periodo elegido</li>
          }
          @if (data.tieneOverrides) {
            <li>Los overrides actuales se eliminarán</li>
          }
        </ul>
        <p class="text-sm text-jac-text-muted">¿Desea continuar?</p>
      } @else {
        <p class="text-jac-text-secondary mb-3">
          Va a cambiar de <strong>{{ data.planOrigen }}</strong> a
          <strong>{{ data.planDestino }}</strong> (plan inferior).
        </p>
        <ul class="list-disc list-inside text-sm text-jac-text-secondary space-y-1 mb-2">
          <li>El cambio será efectivo al final del ciclo actual (cuando venza la vigencia)</li>
          <li>El uso actual debe estar dentro de los límites del plan destino</li>
          @if (data.tieneOverrides) {
            <li>Los overrides se eliminarán</li>
          }
        </ul>
        @if (data.esPlatformAdmin) {
          <div class="mt-3">
            <mat-checkbox [(ngModel)]="forzarDowngrade">
              Forzar cambio inmediato (admin)
            </mat-checkbox>
          </div>
        }
        <p class="text-sm text-jac-text-muted mt-2">¿Desea continuar?</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancelar</button>
      <button mat-raised-button color="primary" (click)="confirmar()">
        Confirmar cambio
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmarCambioPlanDialogComponent {
  forzarDowngrade = false;

  constructor(
    private readonly dialogRef: MatDialogRef<ConfirmarCambioPlanDialogComponent, ConfirmarCambioPlanResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ConfirmarCambioPlanDialogData
  ) {}

  confirmar(): void {
    if (this.data.esUpgrade) {
      this.dialogRef.close(true);
    } else {
      this.dialogRef.close({ confirmado: true, forzarDowngrade: this.forzarDowngrade });
    }
  }
}
