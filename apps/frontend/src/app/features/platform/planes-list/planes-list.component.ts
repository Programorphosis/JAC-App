import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PlatformPlanesService,
  Plan,
  CrearPlanBody,
  ActualizarPlanBody,
} from '../services/platform-planes.service';
import { PlanFormDialogComponent } from '../plan-form-dialog/plan-form-dialog.component';
import { handleApiError } from '../../../shared/operators/handle-api-error.operator';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-planes-list',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatTooltipModule,
    RouterLink,
    DecimalPipe,
    FormsModule,
  ],
  templateUrl: './planes-list.component.html',
  styleUrl: './planes-list.component.scss',
})
export class PlanesListComponent implements OnInit {
  planes: Plan[] = [];
  loading = true;
  incluirInactivos = false;

  constructor(
    private readonly planesService: PlatformPlanesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.planesService.listar(this.incluirInactivos).subscribe({
      next: (p) => {
        this.planes = p;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  limiteTexto(val: number | null, ilimitado?: boolean): string {
    if (ilimitado || val == null) return 'Ilimitado';
    return val.toString();
  }

  abrirCrear(): void {
    this.dialog
      .open(PlanFormDialogComponent, {
        data: { plan: null },
        width: '480px',
      })
      .afterClosed()
      .subscribe((result: CrearPlanBody | null) => {
        if (!result) return;
        this.planesService
          .crear(result)
          .pipe(handleApiError(this.snackBar))
          .subscribe({
            next: () => {
              this.snackBar.open('Plan creado', 'Cerrar', { duration: 2000 });
              this.cargar();
            },
          });
      });
  }

  abrirEditar(plan: Plan): void {
    this.dialog
      .open(PlanFormDialogComponent, {
        data: { plan },
        width: '480px',
      })
      .afterClosed()
      .subscribe((result: ActualizarPlanBody | null) => {
        if (!result) return;
        this.planesService
          .actualizar(plan.id, result)
          .pipe(handleApiError(this.snackBar))
          .subscribe({
            next: () => {
              this.snackBar.open('Plan actualizado', 'Cerrar', { duration: 2000 });
              this.cargar();
            },
          });
      });
  }
}
