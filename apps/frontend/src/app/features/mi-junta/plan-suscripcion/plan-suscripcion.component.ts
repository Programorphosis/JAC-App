import { Component, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { FormatearFechaPipe } from '../../../shared/pipes/formatear-fecha.pipe';
import { FormatearFechaLargaPipe } from '../../../shared/pipes/formatear-fecha-larga.pipe';
import {
  MiJuntaService,
  MiJuntaResponse,
  MiJuntaPlan,
  MiJuntaConsumo,
} from '../services/mi-junta.service';
import { FacturasPlataformaService } from '../../../core/services/facturas-plataforma.service';
import {
  PlanSelectorDialogComponent,
  type PlanSeleccionado,
} from '../../platform/plan-selector-dialog/plan-selector-dialog.component';
import type { JuntaSuscripcionInfo } from '../../platform/services/platform-juntas.service';
import { handleApiError } from '../../../shared/operators/handle-api-error.operator';
import { ConfirmarCambioPlanDialogComponent } from '../../../shared/dialogs/confirmar-cambio-plan-dialog/confirmar-cambio-plan-dialog.component';

@Component({
  selector: 'app-plan-suscripcion',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    DecimalPipe,
    NgClass,
    FormatearFechaLargaPipe,
    FormatearFechaPipe,
    RouterLink,
  ],
  templateUrl: './plan-suscripcion.component.html',
  styleUrl: './plan-suscripcion.component.scss',
})
export class PlanSuscripcionComponent implements OnInit {
  private readonly miJunta = inject(MiJuntaService);
  private readonly facturas = inject(FacturasPlataformaService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  readonly auth = inject(AuthService);

  junta: MiJuntaResponse | null = null;
  consumo: MiJuntaConsumo | null = null;
  loading = true;
  cancelando = false;
  guardandoCancelacion = false;
  motivoCancelacion = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.consumo = null;
    this.miJunta
      .obtener()
      .pipe(handleApiError(this.snackBar))
      .subscribe({
        next: (j) => {
          this.junta = j;
          if (j.suscripcion) {
            this.miJunta
              .consumo()
              .pipe(handleApiError(this.snackBar))
              .subscribe({
                next: (c) => {
                  this.consumo = c;
                },
                error: () => {},
              });
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  /** Porcentaje para barra de progreso (cap 100). */
  progresoPct(actual: number, limite: number | null): number {
    if (limite == null || limite <= 0) return 0;
    return Math.min((actual / limite) * 100, 100);
  }

  /** Clase de color según porcentaje de uso. */
  colorProgreso(actual: number, limite: number | null): string {
    const pct = limite != null && limite > 0 ? (actual / limite) * 100 : 0;
    if (pct >= 100) return 'bg-jac-error';
    if (pct >= 95) return 'bg-orange-500';
    if (pct >= 80) return 'bg-jac-warning';
    return 'bg-jac-success';
  }

  tieneOverrides(): boolean {
    const s = this.junta?.suscripcion;
    if (!s) return false;
    return (
      s.overrideLimiteUsuarios != null ||
      s.overrideLimiteStorageMb != null ||
      s.overrideLimiteCartasMes != null
    );
  }

  abrirCrearSuscripcion(): void {
    this.miJunta
      .listarPlanes()
      .pipe(handleApiError(this.snackBar))
      .subscribe({
        next: (planes) => {
          if (planes.length === 0) {
            this.snackBar.open('No hay planes disponibles', 'Cerrar', { duration: 3000 });
            return;
          }
          this.dialog
            .open(PlanSelectorDialogComponent, {
              data: { titulo: 'Crear suscripción', planes } as { titulo: string; planes: MiJuntaPlan[] },
              width: '720px',
              maxWidth: '95vw',
            })
            .afterClosed()
            .subscribe((sel: PlanSeleccionado | null) => {
              if (!sel) return;
              const { plan, periodo, diasPrueba } = sel;
              if (diasPrueba > 0) {
                this.miJunta
                  .crearSuscripcion(plan.id, diasPrueba, periodo)
                  .pipe(handleApiError(this.snackBar))
                  .subscribe({
                    next: () => {
                      this.cargar();
                      this.snackBar.open(
                        'Suscripción creada. Al terminar el trial deberá pagar para continuar.',
                        'Cerrar',
                        { duration: 4000 },
                      );
                    },
                    error: () => {},
                  });
              } else {
                this.facturas
                  .crearIntencionSuscripcion({
                    planId: plan.id,
                    periodo,
                    diasPrueba: 0,
                  })
                  .pipe(handleApiError(this.snackBar))
                  .subscribe({
                    next: (r) => {
                      window.location.href = r.checkoutUrl;
                    },
                    error: () => {},
                  });
              }
            });
        },
        error: () => {},
      });
  }

  abrirCambiarPlan(): void {
    const suscripcion = this.junta?.suscripcion;
    if (!suscripcion) return;
    this.miJunta
      .listarPlanes()
      .pipe(handleApiError(this.snackBar))
      .subscribe({
        next: (planes) => {
          const periodoActual = (suscripcion.periodo === 'mensual' || suscripcion.periodo === 'anual')
            ? suscripcion.periodo
            : 'anual';
          const planesVisibles = periodoActual === 'mensual'
            ? planes
            : planes.filter((p) => p.id !== suscripcion.plan.id);
          if (planesVisibles.length === 0) {
            this.snackBar.open('No hay otros planes disponibles', 'Cerrar', { duration: 3000 });
            return;
          }
          this.dialog
            .open(PlanSelectorDialogComponent, {
              data: {
                titulo: 'Cambiar plan',
                planes: planesVisibles,
                planActualId: suscripcion.plan.id,
                planActualPrecioMensual: suscripcion.plan.precioMensual,
                planActualPeriodo: periodoActual,
              },
              width: '720px',
              maxWidth: '95vw',
            })
            .afterClosed()
            .subscribe((sel: PlanSeleccionado | null) => {
              if (!sel) return;
              const { plan: nuevoPlan, periodo } = sel;
              const esMismoPlanPeriodo = nuevoPlan.id === suscripcion.plan.id && periodoActual === 'mensual' && periodo === 'anual';
              const esUpgrade = esMismoPlanPeriodo || nuevoPlan.precioMensual > suscripcion.plan.precioMensual;
              this.dialog
                .open(ConfirmarCambioPlanDialogComponent, {
                  data: {
                    planOrigen: suscripcion.plan.nombre,
                    planDestino: nuevoPlan.nombre,
                    esUpgrade,
                    esCambioPeriodo: esMismoPlanPeriodo,
                    tieneOverrides: this.tieneOverrides(),
                  },
                  width: '440px',
                })
                .afterClosed()
                .subscribe((confirmado: boolean) => {
                  if (!confirmado) return;
                  if (esUpgrade) {
                    this.facturas
                      .crearIntencionUpgrade({
                        suscripcionId: suscripcion.id,
                        planId: nuevoPlan.id,
                        periodo,
                      })
                      .pipe(handleApiError(this.snackBar))
                      .subscribe({
                        next: (r) => {
                          window.location.href = r.checkoutUrl;
                        },
                        error: () => {},
                      });
                  } else {
                    this.miJunta
                      .actualizarSuscripcion({ planId: nuevoPlan.id, periodo })
                      .pipe(handleApiError(this.snackBar))
                      .subscribe({
                        next: () => {
                          this.cargar();
                          this.snackBar.open('Plan actualizado', 'Cerrar', { duration: 2000 });
                        },
                        error: () => {},
                      });
                  }
                });
            });
        },
        error: () => {},
      });
  }

  abrirCancelarSuscripcion(): void {
    this.motivoCancelacion = '';
    this.cancelando = true;
  }

  cerrarCancelarSuscripcion(): void {
    this.cancelando = false;
    this.motivoCancelacion = '';
  }

  confirmarCancelacion(): void {
    this.guardandoCancelacion = true;
    this.miJunta
      .cancelarSuscripcion(this.motivoCancelacion || undefined)
      .pipe(handleApiError(this.snackBar))
      .subscribe({
        next: (r) => {
          this.guardandoCancelacion = false;
          this.cancelando = false;
          this.snackBar.open(r.mensaje, 'Cerrar', { duration: 6000 });
          this.cargar();
        },
        error: () => {
          this.guardandoCancelacion = false;
        },
      });
  }
}
