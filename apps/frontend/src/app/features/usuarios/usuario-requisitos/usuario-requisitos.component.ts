import { Component, Input, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RequisitosService, EstadoGeneralResult } from '../../requisitos/services/requisitos.service';

@Component({
  selector: 'app-usuario-requisitos',
  standalone: true,
  imports: [MatCardModule, MatButtonModule],
  templateUrl: './usuario-requisitos.component.html',
  styleUrl: './usuario-requisitos.component.scss',
})
export class UsuarioRequisitosComponent implements OnInit {
  @Input() usuarioId!: string;
  estado: EstadoGeneralResult | null = null;
  loading = false;

  constructor(
    private readonly requisitos: RequisitosService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (this.usuarioId) {
      this.cargar();
    }
  }

  cargar(): void {
    this.loading = true;
    this.requisitos.getEstadoGeneral(this.usuarioId).subscribe({
      next: (e) => {
        this.estado = e;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  cambiarEstado(requisitoTipoId: string, estado: 'AL_DIA' | 'MORA'): void {
    this.requisitos.actualizarEstado(this.usuarioId, requisitoTipoId, estado).subscribe({
      next: () => {
        this.snackBar.open('Estado actualizado', 'Cerrar', { duration: 2000 });
        this.cargar();
      },
      error: (err) => {
        this.snackBar.open(err.error?.error?.message || err.error?.message || 'Error', 'Cerrar', { duration: 5000 });
      },
    });
  }

  cambiarObligacion(requisitoTipoId: string, obligacionActiva: boolean): void {
    this.requisitos.actualizarObligacion(this.usuarioId, requisitoTipoId, obligacionActiva).subscribe({
      next: () => {
        this.snackBar.open('Obligación actualizada', 'Cerrar', { duration: 2000 });
        this.cargar();
      },
      error: (err) => {
        this.snackBar.open(err.error?.error?.message || err.error?.message || 'Error', 'Cerrar', { duration: 5000 });
      },
    });
  }
}
