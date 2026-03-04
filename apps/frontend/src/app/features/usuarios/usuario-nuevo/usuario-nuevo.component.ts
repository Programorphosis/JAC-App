import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UsuariosService, CreateUserBody, UpdateUserBody } from '../services/usuarios.service';
import { UsuarioFormComponent } from '../usuario-form/usuario-form.component';
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-usuario-nuevo',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, UsuarioFormComponent],
  templateUrl: './usuario-nuevo.component.html',
  styleUrl: './usuario-nuevo.component.scss',
})
export class UsuarioNuevoComponent {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {}

  volver(): void {
    this.router.navigate(['/app/usuarios']);
  }

  onGuardar(body: CreateUserBody | UpdateUserBody): void {
    this.usuarios.crear(body as CreateUserBody).subscribe({
      next: (created) => {
        this.snackBar.open('Usuario creado', 'Cerrar', { duration: 2000 });
        this.router.navigate(['/app/usuarios', created.id]);
      },
      error: (err) => {
        this.snackBar.open(getApiErrorMessage(err) || 'Error al crear usuario', 'Cerrar', { duration: 5000 });
      },
    });
  }
}
