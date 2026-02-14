import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsuariosService, UsuarioListItem, DeudaResult, HistorialLaboralItem } from '../services/usuarios.service';
import { UsuarioFormComponent } from '../usuario-form/usuario-form.component';
import { UsuarioDeudaComponent } from '../usuario-deuda/usuario-deuda.component';
import { UsuarioHistorialComponent } from '../usuario-historial/usuario-historial.component';
import { UsuarioRequisitosComponent } from '../usuario-requisitos/usuario-requisitos.component';
import { UsuarioCartasComponent } from '../usuario-cartas/usuario-cartas.component';
import { UsuarioDocumentosComponent } from '../usuario-documentos/usuario-documentos.component';

@Component({
  selector: 'app-usuario-detail',
  standalone: true,
  imports: [
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    UsuarioFormComponent,
    UsuarioDeudaComponent,
    UsuarioHistorialComponent,
    UsuarioRequisitosComponent,
    UsuarioCartasComponent,
    UsuarioDocumentosComponent,
  ],
  templateUrl: './usuario-detail.component.html',
  styleUrl: './usuario-detail.component.scss',
})
export class UsuarioDetailComponent implements OnInit {
  usuario: UsuarioListItem | null = null;
  loading = false;
  editando = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly usuarios: UsuariosService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.cargar(id);
    }
  }

  cargar(id: string): void {
    this.loading = true;
    this.usuarios.obtener(id).subscribe({
      next: (u) => {
        this.usuario = u;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error al cargar usuario', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/usuarios']);
      },
    });
  }

  volver(): void {
    this.router.navigate(['/usuarios']);
  }

  editar(): void {
    this.editando = true;
  }

  onGuardar(body: { nombres?: string; apellidos?: string; telefono?: string; direccion?: string; activo?: boolean }): void {
    if (!this.usuario) return;
    this.usuarios.actualizar(this.usuario.id, body).subscribe({
      next: (actualizado) => {
        this.usuario = { ...this.usuario!, ...actualizado };
        this.editando = false;
        this.snackBar.open('Usuario actualizado', 'Cerrar', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('Error al actualizar', 'Cerrar', { duration: 3000 });
      },
    });
  }

  roles(): string {
    return (this.usuario?.roles || []).join(', ');
  }
}
