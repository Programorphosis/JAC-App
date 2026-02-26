import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DecimalPipe } from '@angular/common';

/** Plan genérico (Plan o MiJuntaPlan) para el modal de detalle. */
export interface PlanParaDetalle {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precioMensual: number;
  precioAnual: number;
  limiteUsuarios: number | null;
  limiteStorageMb: number | null;
  limiteCartasMes: number | null;
  permiteUsuariosIlimitados?: boolean;
  permiteStorageIlimitado?: boolean;
  permiteCartasIlimitadas?: boolean;
  esPersonalizable?: boolean;
  diasPrueba: number;
  precioPorUsuarioAdicional?: number | null;
  precioPorMbAdicional?: number | null;
  precioPorCartaAdicional?: number | null;
}

export interface PlanDetailModalData {
  plan: PlanParaDetalle;
  titulo?: string;
}

@Component({
  selector: 'app-plan-detail-modal',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, DecimalPipe],
  template: `
    <h2 mat-dialog-title>{{ data.titulo ?? 'Detalle del plan' }}: {{ data.plan.nombre }}</h2>
    <mat-dialog-content class="min-w-[360px] max-w-[480px]">
      @if (data.plan.descripcion) {
        <p class="text-jac-text-muted text-sm mb-4">{{ data.plan.descripcion }}</p>
      }
      <div class="space-y-4">
        <div>
          <p class="text-xs font-semibold text-jac-text-muted uppercase tracking-wide">Precios</p>
          <p class="text-lg font-semibold text-jac-text mt-1">
            {{ data.plan.precioMensual | number }} COP/mes
          </p>
          <p class="text-sm text-jac-text-muted">
            {{ data.plan.precioAnual | number }} COP/año
          </p>
        </div>
        <div>
          <p class="text-xs font-semibold text-jac-text-muted uppercase tracking-wide mb-2">Límites incluidos</p>
          <ul class="space-y-1 text-sm text-jac-text-secondary">
            <li class="flex items-center gap-2">
              <mat-icon class="!text-base !w-4 !h-4 text-jac-text-muted">people</mat-icon>
              {{ limiteUsuariosTexto() }}
            </li>
            <li class="flex items-center gap-2">
              <mat-icon class="!text-base !w-4 !h-4 text-jac-text-muted">storage</mat-icon>
              {{ limiteStorageTexto() }}
            </li>
            <li class="flex items-center gap-2">
              <mat-icon class="!text-base !w-4 !h-4 text-jac-text-muted">mail</mat-icon>
              {{ limiteCartasTexto() }}
            </li>
          </ul>
        </div>
        @if (data.plan.diasPrueba > 0) {
          <p class="text-sm text-jac-primary font-medium">
            {{ data.plan.diasPrueba }} días de prueba incluidos
          </p>
        }
        @if (data.plan.esPersonalizable) {
          <div class="rounded-lg border border-jac-border bg-jac-primary-light/30 p-3">
            <p class="text-sm font-medium text-jac-primary mb-2">Plan personalizable</p>
            <p class="text-xs text-jac-text-muted mb-2">
              Puede solicitar aumentos de capacidad. Precios por demanda:
            </p>
            <ul class="text-xs text-jac-text-secondary space-y-1">
              @if (data.plan.precioPorUsuarioAdicional != null && data.plan.precioPorUsuarioAdicional > 0) {
                <li>Usuario adicional: {{ data.plan.precioPorUsuarioAdicional | number }} COP</li>
              }
              @if (data.plan.precioPorMbAdicional != null && data.plan.precioPorMbAdicional > 0) {
                <li>MB adicional: {{ data.plan.precioPorMbAdicional | number }} COP</li>
              }
              @if (data.plan.precioPorCartaAdicional != null && data.plan.precioPorCartaAdicional > 0) {
                <li>Carta adicional: {{ data.plan.precioPorCartaAdicional | number }} COP</li>
              }
            </ul>
          </div>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
      <button mat-raised-button color="primary" (click)="seleccionar()">
        Seleccionar este plan
      </button>
    </mat-dialog-actions>
  `,
})
export class PlanDetailModalComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<PlanDetailModalComponent, PlanParaDetalle | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: PlanDetailModalData
  ) {}

  limiteUsuariosTexto(): string {
    const p = this.data.plan;
    return p.permiteUsuariosIlimitados
      ? 'Usuarios ilimitados'
      : p.limiteUsuarios != null
        ? `${p.limiteUsuarios} usuarios`
        : 'Sin límite';
  }

  limiteStorageTexto(): string {
    const p = this.data.plan;
    return p.permiteStorageIlimitado
      ? 'Storage ilimitado'
      : p.limiteStorageMb != null
        ? `${p.limiteStorageMb} MB`
        : 'Sin storage';
  }

  limiteCartasTexto(): string {
    const p = this.data.plan;
    return p.permiteCartasIlimitadas
      ? 'Cartas ilimitadas por mes'
      : p.limiteCartasMes != null
        ? `${p.limiteCartasMes} cartas por mes`
        : 'Sin límite';
  }

  seleccionar(): void {
    this.dialogRef.close(this.data.plan);
  }
}
