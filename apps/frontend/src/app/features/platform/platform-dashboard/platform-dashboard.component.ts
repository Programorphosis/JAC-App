import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DecimalPipe, NgClass, DatePipe } from '@angular/common';
import { PlatformDashboardService, DashboardData } from '../services/platform-dashboard.service';
import { PlatformFacturasService } from '../services/platform-facturas.service';
import { PlatformAvisosService, AvisoPlataforma } from '../services/platform-avisos.service';
import { PlatformReportesService } from '../services/platform-reportes.service';
import { AvisoCrearDialogComponent } from '../aviso-crear-dialog/aviso-crear-dialog.component';
import { AvisoEditarDialogComponent } from '../aviso-editar-dialog/aviso-editar-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { handleApiError } from '../../../shared/operators/handle-api-error.operator';
import { NombreCompletoJuntaPipe } from '../../../shared/pipes/nombre-completo-junta.pipe';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-platform-dashboard',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    RouterLink,
    DecimalPipe,
    NgClass,
    DatePipe,
    NombreCompletoJuntaPipe,
  ],
  templateUrl: './platform-dashboard.component.html',
  styleUrl: './platform-dashboard.component.scss',
})
export class PlatformDashboardComponent implements OnInit {
  data: DashboardData | null = null;
  loading = true;
  generandoFacturas = false;
  resultadoFacturas: { generadas: number; omitidas: number; errores: string[] } | null = null;
  avisos: AvisoPlataforma[] = [];
  loadingAvisos = true;
  descargandoReporte: 'juntas' | 'facturacion' | 'uso' | null = null;

  constructor(
    private readonly dashboard: PlatformDashboardService,
    private readonly facturas: PlatformFacturasService,
    private readonly avisosService: PlatformAvisosService,
    private readonly reportesService: PlatformReportesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.dashboard.obtener().subscribe({
      next: (d) => {
        this.data = d;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
    this.cargarAvisos();
  }

  private cargarAvisos(): void {
    this.loadingAvisos = true;
    this.avisosService.listar().subscribe({
      next: (a) => {
        this.avisos = a;
        this.loadingAvisos = false;
      },
      error: () => (this.loadingAvisos = false),
    });
  }

  abrirCrearAviso(): void {
    const ref = this.dialog.open(AvisoCrearDialogComponent, { width: '500px' });
    ref.afterClosed().subscribe((creado) => {
      if (creado) this.cargarAvisos();
    });
  }

  editarAviso(a: AvisoPlataforma): void {
    const ref = this.dialog.open(AvisoEditarDialogComponent, {
      width: '500px',
      data: { aviso: a },
    });
    ref.afterClosed().subscribe((guardado) => {
      if (guardado) this.cargarAvisos();
    });
  }

  toggleActivo(a: AvisoPlataforma): void {
    const nuevo = !a.activo;
    const accion = nuevo ? 'activar' : 'desactivar';
    this.abrirConfirmacion({
      titulo: nuevo ? 'Activar aviso' : 'Desactivar aviso',
      mensaje: `¿Desea ${accion} este aviso? Los avisos inactivos no se muestran a las juntas.`,
      textoConfirmar: nuevo ? 'Activar' : 'Desactivar',
      peligroso: !nuevo,
    }).subscribe((ok) => {
      if (!ok) return;
      this.avisosService
        .actualizar(a.id, { activo: nuevo })
        .pipe(handleApiError(this.snackBar))
        .subscribe({ next: () => this.cargarAvisos() });
    });
  }

  eliminarAviso(a: AvisoPlataforma): void {
    this.abrirConfirmacion({
      titulo: 'Eliminar aviso',
      mensaje: `¿Está seguro de eliminar el aviso "${a.titulo}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligroso: true,
    }).subscribe((ok) => {
      if (!ok) return;
      this.avisosService
        .eliminar(a.id)
        .pipe(handleApiError(this.snackBar))
        .subscribe({ next: () => this.cargarAvisos() });
    });
  }

  private abrirConfirmacion(data: ConfirmDialogData) {
    return this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data,
        width: '400px',
      })
      .afterClosed();
  }

  descargarReporteJuntas(): void {
    this.descargandoReporte = 'juntas';
    this.reportesService.descargarJuntas().subscribe({
      next: () => (this.descargandoReporte = null),
      error: () => (this.descargandoReporte = null),
    });
  }

  descargarReporteFacturacion(): void {
    this.descargandoReporte = 'facturacion';
    this.reportesService.descargarFacturacion().subscribe({
      next: () => (this.descargandoReporte = null),
      error: () => (this.descargandoReporte = null),
    });
  }

  descargarReporteUso(): void {
    this.descargandoReporte = 'uso';
    this.reportesService.descargarUso().subscribe({
      next: () => (this.descargandoReporte = null),
      error: () => (this.descargandoReporte = null),
    });
  }

  generarFacturasMensuales(): void {
    this.generandoFacturas = true;
    this.resultadoFacturas = null;
    this.facturas.generarFacturasMensuales().subscribe({
      next: (r) => {
        this.resultadoFacturas = r.data;
        this.generandoFacturas = false;
      },
      error: () => (this.generandoFacturas = false),
    });
  }
}
