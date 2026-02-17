import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MiJuntaService, MiJuntaResponse } from '../services/mi-junta.service';
import { PagosService, EstadisticasPagos } from '../../pagos/services/pagos.service';
import { AuthService } from '../../../core/auth/auth.service';
import { FormatearFechaPipe } from '../../../shared/pipes/formatear-fecha.pipe';
import { handleApiError } from '../../../shared/operators/handle-api-error.operator';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-mi-junta',
  standalone: true,
  imports: [
    DecimalPipe,
    NgClass,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    RouterLink,
    FormatearFechaPipe,
  ],
  templateUrl: './mi-junta.component.html',
  styleUrl: './mi-junta.component.scss',
})
export class MiJuntaComponent implements OnInit {
  private readonly miJuntaService = inject(MiJuntaService);
  private readonly pagosSvc = inject(PagosService);
  private readonly snackBar = inject(MatSnackBar);

  readonly auth = inject(AuthService);

  junta: MiJuntaResponse | null = null;
  loading = false;
  estadisticas = signal<EstadisticasPagos | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.miJuntaService
      .obtener()
      .pipe(handleApiError(this.snackBar))
      .subscribe({
        next: (j) => {
          this.junta = j;
          this.loading = false;
          if (this.auth.can(this.auth.permissions.PAGOS_VER)) {
            this.cargarEstadisticas();
          }
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  private cargarEstadisticas(): void {
    this.pagosSvc.getEstadisticas().subscribe({
      next: (e) => this.estadisticas.set(e),
    });
  }

  formatearMoneda(v: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(v);
  }

  ubicacionTexto(): string {
    const j = this.junta;
    if (!j) return '';
    const parts: string[] = [];
    if (j.ciudad) parts.push(j.ciudad);
    if (j.departamento) parts.push(`(${j.departamento})`);
    return parts.join(' ');
  }
}
