import { Component, Inject, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import type { Plan } from '../services/platform-planes.service';
import {
  PlanDetailModalComponent,
  type PlanParaDetalle,
} from '../plan-detail-modal/plan-detail-modal.component';

export interface PlanSelectorDialogData {
  titulo: string;
  planes: Plan[] | PlanParaDetalle[];
  /** Plan actual (para excluir en cambiar plan) */
  planActualId?: string;
  /** Precio mensual del plan actual (para mostrar hint de downgrade) */
  planActualPrecioMensual?: number;
  /** Periodo actual: si mensual, se incluye el plan actual para cambio a anual (con pago) */
  planActualPeriodo?: 'mensual' | 'anual';
}

export type PlanSeleccionado = {
  plan: Plan | PlanParaDetalle;
  periodo: 'mensual' | 'anual';
  /** Días de prueba. 0 = sin prueba (usa periodo). Si plan tiene trial, usuario puede elegir. */
  diasPrueba: number;
};

@Component({
  selector: 'app-plan-selector-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatRadioModule,
    MatCheckboxModule,
    FormsModule,
    DecimalPipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content class="w-full min-w-0 max-w-[720px] overflow-x-hidden">
      <p class="text-sm text-jac-text-muted mb-4">
        Seleccione un plan o haga clic en "Ver detalles" para más información.
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        @for (p of planesDisponibles; track p.id) {
          <mat-card class="plan-card cursor-pointer hover:shadow-lg transition-shadow"
            (click)="abrirDetalle(p)">
            <mat-card-header>
              <mat-card-title class="!text-lg">{{ p.nombre }}</mat-card-title>
              <mat-card-subtitle class="!mt-1 break-words">
                {{ p.precioMensual | number }} COP/mes · {{ p.precioAnual | number }} COP/año
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="mb-3 p-2 rounded bg-jac-surface-alt border border-jac-border-subtle space-y-2">
                @if (p.diasPrueba > 0) {
                  <mat-checkbox [(ngModel)]="usarPruebaPorPlan[p.id]" [name]="'prueba-' + p.id">
                    Incluir {{ p.diasPrueba }} días de prueba
                  </mat-checkbox>
                }
                <div [class.opacity-60]="(p.diasPrueba || 0) > 0 && usarPruebaPorPlan[p.id]">
                  <p class="text-xs font-medium text-jac-text-muted mb-1">Facturación</p>
                  <mat-radio-group [(ngModel)]="periodoPorPlan[p.id]" [name]="'periodo-' + p.id">
                    <mat-radio-button value="mensual" class="mr-3">Mensual</mat-radio-button>
                    <mat-radio-button value="anual">Anual</mat-radio-button>
                  </mat-radio-group>
                  <p class="text-xs text-jac-text-muted mt-0.5">
                    @if (usarPruebaPorPlan[p.id]) {
                      (aplica después de la prueba)
                    } @else {
                      Vence en 1 mes o 1 año según selección
                    }
                  </p>
                </div>
              </div>
              <div class="flex flex-wrap gap-1 mb-3">
                @if (p.diasPrueba > 0) {
                  <span class="px-2 py-0.5 rounded text-xs bg-jac-success-bg text-jac-success">
                    {{ p.diasPrueba }} días prueba
                  </span>
                }
                @if (p.esPersonalizable) {
                  <span class="px-2 py-0.5 rounded text-xs bg-jac-primary-light text-jac-primary">
                    Personalizable
                  </span>
                }
              </div>
              <p class="text-xs text-jac-text-muted mb-3">
                {{ resumenLimites(p) }}
              </p>
              @if (esDowngrade(p)) {
                <p class="text-xs text-jac-warning mb-2">
                  Plan inferior. Efectivo al final del ciclo actual.
                </p>
              }
              @if (esMismoPlanCambioPeriodo(p)) {
                <p class="text-xs text-jac-info mb-2">
                  Cambio a facturación anual. Requiere pago inmediato.
                </p>
              }
              <div class="flex flex-wrap gap-2 items-center">
                <button mat-stroked-button (click)="abrirDetalle(p); $event.stopPropagation()">
                  <mat-icon class="icon-inline">info</mat-icon>
                  Ver detalles
                </button>
                <button mat-raised-button color="primary" (click)="seleccionarDirecto(p); $event.stopPropagation()">
                  Seleccionar
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .plan-card {
      min-height: 200px;
    }
    .icon-inline {
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-right: 6px;
      vertical-align: middle;
    }
  `],
})
export class PlanSelectorDialogComponent {
  planesDisponibles: (Plan | PlanParaDetalle)[];
  periodoPorPlan: Record<string, 'mensual' | 'anual'> = {};
  /** true = usar días de prueba del plan. false = empezar a pagar ya (periodo aplica). */
  usarPruebaPorPlan: Record<string, boolean> = {};

  private readonly dialog = inject(MatDialog);

  constructor(
    private readonly dialogRef: MatDialogRef<PlanSelectorDialogComponent, PlanSeleccionado | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: PlanSelectorDialogData
  ) {
    this.planesDisponibles = data.planActualId
      ? data.planes.filter(
          (p) =>
            p.id !== data.planActualId ||
            (p.id === data.planActualId && data.planActualPeriodo === 'mensual'),
        )
      : [...data.planes];
    this.planesDisponibles.forEach((p) => {
      this.periodoPorPlan[p.id] ??= 'anual';
      this.usarPruebaPorPlan[p.id] ??= (p.diasPrueba ?? 0) > 0;
    });
  }

  getDiasPrueba(p: Plan | PlanParaDetalle): number {
    return this.usarPruebaPorPlan[p.id] ? (p.diasPrueba ?? 0) : 0;
  }

  esDowngrade(p: Plan | PlanParaDetalle): boolean {
    const actual = this.data.planActualPrecioMensual;
    return actual != null && p.precioMensual < actual;
  }

  esMismoPlanCambioPeriodo(p: Plan | PlanParaDetalle): boolean {
    return (
      this.data.planActualId != null &&
      p.id === this.data.planActualId &&
      this.data.planActualPeriodo === 'mensual'
    );
  }

  resumenLimites(p: Plan | PlanParaDetalle): string {
    const users = p.permiteUsuariosIlimitados ? '∞' : (p.limiteUsuarios ?? '—');
    const storage = p.permiteStorageIlimitado ? '∞' : (p.limiteStorageMb != null ? `${p.limiteStorageMb} MB` : '—');
    const cartas = p.permiteCartasIlimitadas ? '∞' : (p.limiteCartasMes ?? '—');
    return `${users} usuarios · ${storage} · ${cartas} cartas/mes`;
  }

  abrirDetalle(plan: Plan | PlanParaDetalle): void {
    this.dialog
      .open(PlanDetailModalComponent, {
        data: { plan, titulo: 'Detalle del plan' },
        width: '440px',
      })
      .afterClosed()
      .subscribe((selected: PlanParaDetalle | null) => {
        if (selected) {
          this.dialogRef.close({
            plan: selected,
            periodo: this.periodoPorPlan[selected.id] ?? 'anual',
            diasPrueba: this.getDiasPrueba(selected),
          });
        }
      });
  }

  seleccionarDirecto(plan: Plan | PlanParaDetalle): void {
    this.dialogRef.close({
      plan,
      periodo: this.periodoPorPlan[plan.id] ?? 'anual',
      diasPrueba: this.getDiasPrueba(plan),
    });
  }
}
