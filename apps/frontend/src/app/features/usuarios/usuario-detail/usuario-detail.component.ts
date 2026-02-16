import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { AppCanDirective } from '../../../core/auth/app-can.directive';
import { FormatearNombrePipe } from '../../../shared/pipes/formatear-nombre.pipe';

const TAB_DEUDA = 0;
const TAB_HISTORIAL = 1;
const TAB_REQUISITOS = 2;
const TAB_CARTAS = 3;
const TAB_DOCUMENTOS = 4;

@Component({
  selector: 'app-usuario-detail',
  standalone: true,
  imports: [
    RouterLink,
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
    AppCanDirective,
    FormatearNombrePipe,
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
    readonly auth: AuthService
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
        this.router.navigate(this.auth.can(this.auth.permissions.USUARIOS_VER) ? ['/usuarios'] : ['/']);
      },
    });
  }

  volver(): void {
    if (this.usuario && this.usuario.id === this.auth.currentUser()?.id && !this.auth.can(this.auth.permissions.USUARIOS_VER)) {
      this.router.navigate(['/']);
    } else {
      this.router.navigate(['/usuarios']);
    }
  }


  /** Modificador viendo a OTRO usuario: solo tab Requisitos (obligaciones). En Mi cuenta ve todo. */
  esModificadorViendoOtro(): boolean {
    const u = this.auth.currentUser();
    if (!u?.esModificador || !u?.juntaId || !this.usuario) return false;
    return this.usuario.id !== u.id;
  }

  /** ADMIN viendo su propia cuenta: no es afiliado, mostrar panel de config. */
  esAdminViendoMiCuenta(): boolean {
    const u = this.auth.currentUser();
    return !!(
      this.auth.esAdminSolo() &&
      u?.id &&
      this.usuario &&
      this.usuario.id === u.id
    );
  }

  /** ADMIN viendo otro usuario: solo tabs que puede ver (sin Cartas). */
  esAdminViendoOtro(): boolean {
    const u = this.auth.currentUser();
    return !!(
      this.auth.esAdminSolo() &&
      u?.id &&
      this.usuario &&
      this.usuario.id !== u.id
    );
  }

  /** TESORERA viendo otro usuario: tabs sin Cartas (solo SECRETARIA ve cartas de otros). */
  esTesoreraViendoOtro(): boolean {
    const u = this.auth.currentUser();
    return !!(
      this.auth.hasRole('TESORERA') &&
      u?.id &&
      this.usuario &&
      this.usuario.id !== u.id
    );
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

  /** Formato: 01 de enero de 2026 */
  formatearFecha(f: string): string {
    if (!f) return '—';
    const d = new Date(f);
    const dia = d.getDate().toString().padStart(2, '0');
    const mes = d.toLocaleDateString('es-CO', { month: 'long' });
    const anio = d.getFullYear();
    return `${dia} de ${mes} de ${anio}`;
  }

  /** Etiqueta legible para cada rol. */
  etiquetaRol(rol: string): string {
    const map: Record<string, string> = {
      ADMIN: 'Administrador',
      SECRETARIA: 'Secretaría',
      TESORERA: 'Tesorera',
      RECEPTOR_AGUA: 'Receptor de agua',
      CIUDADANO: 'Ciudadano',
    };
    return map[rol] ?? rol;
  }

  /** Índice de tab para ADMIN viendo otro (sin Cartas). */
  tabIndexAdmin(): number {
    if (this.tabSeleccionado === TAB_CARTAS) return 0;
    if (this.tabSeleccionado === TAB_DOCUMENTOS) return 3;
    return Math.min(this.tabSeleccionado, 3);
  }
}
