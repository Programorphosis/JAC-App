import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Plan, CrearPlanBody, ActualizarPlanBody } from '../services/platform-planes.service';

export interface PlanFormDialogData {
  plan?: Plan | null;
}

@Component({
  selector: 'app-plan-form-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.plan ? 'Editar plan' : 'Nuevo plan' }}</h2>
    <form [formGroup]="form" (ngSubmit)="guardar()">
      <mat-dialog-content class="flex flex-col gap-4 min-w-[320px]">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" placeholder="Ej: Básico" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Descripción</mat-label>
          <textarea matInput formControlName="descripcion" rows="2" placeholder="Opcional"></textarea>
        </mat-form-field>
        <div class="grid grid-cols-2 gap-4">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Precio mensual (COP)</mat-label>
            <input matInput type="number" formControlName="precioMensual" min="0" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Precio anual (COP)</mat-label>
            <input matInput type="number" formControlName="precioAnual" min="0" />
          </mat-form-field>
        </div>
        <div class="space-y-2">
          <p class="text-sm font-medium text-jac-text-secondary">Límites</p>
          <mat-slide-toggle formControlName="permiteUsuariosIlimitados" class="block">
            Usuarios ilimitados
          </mat-slide-toggle>
          @if (!form.get('permiteUsuariosIlimitados')?.value) {
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Límite usuarios</mat-label>
              <input matInput type="number" formControlName="limiteUsuarios" min="0" />
            </mat-form-field>
          }
          <mat-slide-toggle formControlName="permiteStorageIlimitado" class="block">
            Storage ilimitado
          </mat-slide-toggle>
          @if (!form.get('permiteStorageIlimitado')?.value) {
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Límite storage (MB)</mat-label>
              <input matInput type="number" formControlName="limiteStorageMb" min="0" />
            </mat-form-field>
          }
          <mat-slide-toggle formControlName="permiteCartasIlimitadas" class="block">
            Cartas/mes ilimitadas
          </mat-slide-toggle>
          @if (!form.get('permiteCartasIlimitadas')?.value) {
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Límite cartas/mes</mat-label>
              <input matInput type="number" formControlName="limiteCartasMes" min="0" />
            </mat-form-field>
          }
        </div>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Días de prueba</mat-label>
          <input matInput type="number" formControlName="diasPrueba" min="0" />
        </mat-form-field>
        <mat-slide-toggle formControlName="esPersonalizable" class="block">
          Plan personalizable (permite overrides en suscripción)
        </mat-slide-toggle>
        @if (form.get('esPersonalizable')?.value) {
          <div class="rounded-lg border border-jac-border bg-jac-primary-light/30 p-4 space-y-3">
            <p class="text-sm font-medium text-jac-primary">Precios por demanda</p>
            <p class="text-xs text-jac-text-muted">Cobro adicional por unidades que excedan los límites base del plan.</p>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Precio por usuario adicional (COP)</mat-label>
              <input matInput type="number" formControlName="precioPorUsuarioAdicional" min="0" placeholder="0" />
              <mat-hint>Por cada usuario que supere el límite base</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Precio por MB adicional (COP)</mat-label>
              <input matInput type="number" formControlName="precioPorMbAdicional" min="0" placeholder="0" />
              <mat-hint>Por cada MB que supere el límite de storage</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Precio por carta adicional (COP)</mat-label>
              <input matInput type="number" formControlName="precioPorCartaAdicional" min="0" placeholder="0" />
              <mat-hint>Por cada carta que supere el límite mensual</mat-hint>
            </mat-form-field>
          </div>
        }
        @if (data.plan) {
          <mat-slide-toggle formControlName="activo" class="block">
            Plan activo
          </mat-slide-toggle>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" mat-button mat-dialog-close>Cancelar</button>
        <button type="submit" mat-raised-button color="primary" [disabled]="form.invalid || guardando">
          {{ guardando ? 'Guardando...' : 'Guardar' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class PlanFormDialogComponent {
  form: FormGroup;
  guardando = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<PlanFormDialogComponent, CrearPlanBody | (ActualizarPlanBody & { activo?: boolean }) | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: PlanFormDialogData
  ) {
    const p = data.plan;
    this.form = this.fb.group({
      nombre: [p?.nombre ?? '', Validators.required],
      descripcion: [p?.descripcion ?? ''],
      precioMensual: [p?.precioMensual ?? 0, [Validators.required, Validators.min(0)]],
      precioAnual: [p?.precioAnual ?? 0, [Validators.required, Validators.min(0)]],
      limiteUsuarios: [p?.limiteUsuarios ?? null],
      limiteStorageMb: [p?.limiteStorageMb ?? null],
      limiteCartasMes: [p?.limiteCartasMes ?? null],
      permiteUsuariosIlimitados: [p?.permiteUsuariosIlimitados ?? false],
      permiteStorageIlimitado: [p?.permiteStorageIlimitado ?? false],
      permiteCartasIlimitadas: [p?.permiteCartasIlimitadas ?? false],
      esPersonalizable: [p?.esPersonalizable ?? false],
      diasPrueba: [p?.diasPrueba ?? 0, [Validators.min(0)]],
      activo: [p?.activo ?? true],
      precioPorUsuarioAdicional: [p?.precioPorUsuarioAdicional ?? null, [Validators.min(0)]],
      precioPorMbAdicional: [p?.precioPorMbAdicional ?? null, [Validators.min(0)]],
      precioPorCartaAdicional: [p?.precioPorCartaAdicional ?? null, [Validators.min(0)]],
    });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando) return;
    const v = this.form.value;
    const body: CrearPlanBody & { activo?: boolean } = {
      nombre: v.nombre.trim(),
      descripcion: v.descripcion?.trim() || undefined,
      precioMensual: Number(v.precioMensual),
      precioAnual: Number(v.precioAnual),
      limiteUsuarios: v.permiteUsuariosIlimitados ? null : (v.limiteUsuarios ? Number(v.limiteUsuarios) : null),
      limiteStorageMb: v.permiteStorageIlimitado ? null : (v.limiteStorageMb ? Number(v.limiteStorageMb) : null),
      limiteCartasMes: v.permiteCartasIlimitadas ? null : (v.limiteCartasMes ? Number(v.limiteCartasMes) : null),
      permiteUsuariosIlimitados: v.permiteUsuariosIlimitados,
      permiteStorageIlimitado: v.permiteStorageIlimitado,
      permiteCartasIlimitadas: v.permiteCartasIlimitadas,
      esPersonalizable: v.esPersonalizable,
      diasPrueba: Number(v.diasPrueba),
      precioPorUsuarioAdicional:
        v.esPersonalizable && v.precioPorUsuarioAdicional != null && v.precioPorUsuarioAdicional !== ''
          ? Number(v.precioPorUsuarioAdicional)
          : null,
      precioPorMbAdicional:
        v.esPersonalizable && v.precioPorMbAdicional != null && v.precioPorMbAdicional !== ''
          ? Number(v.precioPorMbAdicional)
          : null,
      precioPorCartaAdicional:
        v.esPersonalizable && v.precioPorCartaAdicional != null && v.precioPorCartaAdicional !== ''
          ? Number(v.precioPorCartaAdicional)
          : null,
    };
    if (this.data.plan) {
      (body as { activo?: boolean }).activo = v.activo;
    }
    this.dialogRef.close(body);
  }
}
