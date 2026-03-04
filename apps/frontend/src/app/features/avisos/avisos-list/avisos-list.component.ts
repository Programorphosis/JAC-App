import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AvisosService, AvisoPlataforma } from '../../../core/services/avisos.service';
import {
  AvisosJuntaService,
  AvisoJunta,
} from '../services/avisos-junta.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PERMISSIONS } from '../../../core/auth/permissions.constants';
import { AvisoJuntaCrearDialogComponent } from '../aviso-junta-crear-dialog/aviso-junta-crear-dialog.component';
import {
  AvisoJuntaEditarDialogComponent,
  AvisoJuntaEditarDialogData,
} from '../aviso-junta-editar-dialog/aviso-junta-editar-dialog.component';

@Component({
  selector: 'app-avisos-list',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    DatePipe,
  ],
  templateUrl: './avisos-list.component.html',
  styleUrl: './avisos-list.component.scss',
})
export class AvisosListComponent implements OnInit {
  avisosPlataforma: AvisoPlataforma[] = [];
  avisosJunta: AvisoJunta[] = [];
  loading = true;

  readonly PERMISSIONS = PERMISSIONS;

  constructor(
    private readonly avisosSvc: AvisosService,
    private readonly avisosJuntaSvc: AvisosJuntaService,
    private readonly auth: AuthService,
    private readonly dialog: MatDialog
  ) {}

  get puedeGestionarAvisosJunta(): boolean {
    return this.auth.can(this.PERMISSIONS.AVISOS_JUNTA_GESTIONAR);
  }

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.loading = true;
    forkJoin({
      plataforma: this.avisosSvc.listarActivos(),
      junta: this.avisosJuntaSvc.listarActivos(),
    }).subscribe({
      next: ({ plataforma, junta }) => {
        this.avisosPlataforma = plataforma;
        this.avisosJunta = junta;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  abrirCrear(): void {
    const ref = this.dialog.open(AvisoJuntaCrearDialogComponent, {
      width: '480px',
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.cargar();
    });
  }

  abrirEditar(aviso: AvisoJunta): void {
    const ref = this.dialog.open(AvisoJuntaEditarDialogComponent, {
      width: '480px',
      data: { aviso } satisfies AvisoJuntaEditarDialogData,
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.cargar();
    });
  }

  eliminar(aviso: AvisoJunta): void {
    if (!confirm(`¿Eliminar el aviso "${aviso.titulo}"?`)) return;
    this.avisosJuntaSvc.eliminar(aviso.id).subscribe({
      next: () => this.cargar(),
    });
  }

  nombreCreador(a: AvisoJunta): string {
    const p = a.creadoPor;
    if (!p) return '';
    return `${p.nombres} ${p.apellidos}`.trim();
  }
}
