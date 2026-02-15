import { Component, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { PlatformService, JuntaDetalle } from '../services/platform.service';
import { JuntaFormComponent } from '../junta-form/junta-form.component';
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-junta-detail',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatSnackBarModule, MatIconModule, JuntaFormComponent, DecimalPipe],
  templateUrl: './junta-detail.component.html',
  styleUrl: './junta-detail.component.scss',
})
export class JuntaDetailComponent implements OnInit {
  junta: JuntaDetalle | null = null;
  loading = false;
  editando = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly platform: PlatformService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nueva') {
      this.cargar(id);
    }
  }

  cargar(id: string): void {
    this.loading = true;
    this.platform.obtener(id).subscribe({
      next: (j) => {
        this.junta = j;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
        this.router.navigate(['/platform', 'juntas']);
      },
    });
  }

  volver(): void {
    this.router.navigate(['/platform', 'juntas']);
  }

  editar(): void {
    this.editando = true;
  }

  onGuardar(body: { nombre: string; nit?: string; montoCarta?: number | null }): void {
    if (!this.junta) return;
    this.platform.actualizar(this.junta.id, {
      nombre: body.nombre,
      nit: body.nit ?? undefined,
      montoCarta: body.montoCarta ?? undefined,
    }).subscribe({
      next: (actualizada) => {
        this.junta = { ...this.junta!, ...actualizada };
        this.editando = false;
        this.snackBar.open('Junta actualizada', 'Cerrar', { duration: 2000 });
      },
      error: (err) => {
        this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
      },
    });
  }

  formatearFecha(f: string): string {
    return new Date(f).toLocaleDateString('es-CO');
  }
}
