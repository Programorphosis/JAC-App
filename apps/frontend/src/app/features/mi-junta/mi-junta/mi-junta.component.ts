import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MiJuntaService, MiJuntaResponse } from '../services/mi-junta.service';
import { PagosService, EstadisticasPagos } from '../../pagos/services/pagos.service';
import { AuthService } from '../../../core/auth/auth.service';
import { FormatearFechaPipe } from '../../../shared/pipes/formatear-fecha.pipe';
import { NombreCompletoJuntaPipe } from '../../../shared/pipes/nombre-completo-junta.pipe';
import { handleApiError } from '../../../shared/operators/handle-api-error.operator';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-mi-junta',
  standalone: true,
  imports: [
    DecimalPipe,
    NgClass,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
    FormatearFechaPipe,
    NombreCompletoJuntaPipe,
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
  exportandoReporte = false;

  editandoContacto = false;
  guardandoContacto = false;
  contactoForm: {
    telefono: string;
    email: string;
    direccion: string;
    ciudad: string;
    departamento: string;
  } = { telefono: '', email: '', direccion: '', ciudad: '', departamento: '' };

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

  descargarReporteAnual(): void {
    this.exportandoReporte = true;
    const anio = new Date().getFullYear();
    this.miJuntaService.reporteAnual(anio).subscribe({
      next: (res) => {
        this.exportandoReporte = false;
        const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.filename;
        a.click();
        URL.revokeObjectURL(url);
        this.snackBar.open('Reporte descargado', 'Cerrar', { duration: 2000 });
      },
      error: () => {
        this.exportandoReporte = false;
        this.snackBar.open('Error al exportar reporte', 'Cerrar', { duration: 3000 });
      },
    });
  }

  ubicacionTexto(): string {
    const j = this.junta;
    if (!j) return '';
    const parts: string[] = [];
    if (j.ciudad) parts.push(j.ciudad);
    if (j.departamento) parts.push(`(${j.departamento})`);
    return parts.join(' ');
  }

  abrirEditarContacto(): void {
    if (!this.junta) return;
    this.contactoForm = {
      telefono: this.junta.telefono ?? '',
      email: this.junta.email ?? '',
      direccion: this.junta.direccion ?? '',
      ciudad: this.junta.ciudad ?? '',
      departamento: this.junta.departamento ?? '',
    };
    this.editandoContacto = true;
  }

  cancelarEditarContacto(): void {
    this.editandoContacto = false;
  }

  guardarContacto(): void {
    this.guardandoContacto = true;
    const body = {
      telefono: this.contactoForm.telefono.trim() || null,
      email: this.contactoForm.email.trim() || null,
      direccion: this.contactoForm.direccion.trim() || null,
      ciudad: this.contactoForm.ciudad.trim() || null,
      departamento: this.contactoForm.departamento.trim() || null,
    };
    this.miJuntaService
      .actualizarDatos(body)
      .pipe(handleApiError(this.snackBar))
      .subscribe({
        next: () => {
          this.guardandoContacto = false;
          this.editandoContacto = false;
          this.snackBar.open('Datos de contacto actualizados', 'Cerrar', { duration: 3000 });
          this.cargar();
        },
        error: () => {
          this.guardandoContacto = false;
        },
      });
  }
}
