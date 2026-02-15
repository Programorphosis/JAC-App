import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PlatformService, CreateJuntaBody, CreateJuntaResult } from '../services/platform.service';
import { JuntaFormComponent } from '../junta-form/junta-form.component';
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-junta-nueva',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, JuntaFormComponent],
  templateUrl: './junta-nueva.component.html',
  styleUrl: './junta-nueva.component.scss',
})
export class JuntaNuevaComponent {
  credenciales: CreateJuntaResult | null = null;

  constructor(
    private readonly platform: PlatformService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {}

  volver(): void {
    this.router.navigate(['/platform', 'juntas']);
  }

  onGuardar(body: CreateJuntaBody | { nombre: string; nit: string; montoCarta: number | null }): void {
    this.platform.crear(body as CreateJuntaBody).subscribe({
      next: (result) => {
        this.credenciales = result;
        this.snackBar.open('Junta creada. Guarda las credenciales.', 'Cerrar', { duration: 5000 });
      },
      error: (err) => {
        this.snackBar.open(getApiErrorMessage(err) || 'Error al crear junta', 'Cerrar', { duration: 5000 });
      },
    });
  }

  irAListado(): void {
    this.router.navigate(['/platform', 'juntas']);
  }
}
