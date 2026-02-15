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
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';
import { AuthService } from '../../../core/auth/auth.service';

const TAB_DEUDA = 0;
const TAB_HISTORIAL = 1;
const TAB_REQUISITOS = 2;
const TAB_CARTAS = 3;
const TAB_DOCUMENTOS = 4;

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
  tabSeleccionado = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly usuarios: UsuariosService,
    private readonly snackBar: MatSnackBar,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.cargar(id);
    }
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'cartas') this.tabSeleccionado = TAB_CARTAS;
    else if (tab === 'deuda') this.tabSeleccionado = TAB_DEUDA;
    else if (tab === 'documentos') this.tabSeleccionado = TAB_DOCUMENTOS;
  }

  cargar(id: string): void {
    this.loading = true;
    this.usuarios.obtener(id).subscribe({
      next: (u) => {
        this.usuario = u;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
        this.router.navigate(this.auth.puedeVerUsuarios() ? ['/usuarios'] : ['/']);
      },
    });
  }

  volver(): void {
    if (this.usuario && this.usuario.id === this.auth.currentUser()?.id && !this.auth.puedeVerUsuarios()) {
      this.router.navigate(['/']);
    } else {
      this.router.navigate(['/usuarios']);
    }
  }

  puedeEditarUsuario(): boolean {
    return this.auth.hasRole('ADMIN') || this.auth.hasRole('SECRETARIA');
  }

  /** Modificador viendo a OTRO usuario: solo tab Requisitos (obligaciones). En Mi cuenta ve todo. */
  esModificadorViendoOtro(): boolean {
    const u = this.auth.currentUser();
    if (!u?.esModificador || !u?.juntaId || !this.usuario) return false;
    return this.usuario.id !== u.id;
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
      error: (err) => {
        this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
      },
    });
  }

  roles(): string {
    return (this.usuario?.roles || []).join(', ');
  }
}
