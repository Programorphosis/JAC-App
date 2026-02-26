import { Component, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { UsuariosService, UsuarioListItem, DeudaResult, HistorialLaboralItem } from '../services/usuarios.service';
import { UsuarioFormComponent } from '../usuario-form/usuario-form.component';
import { UsuarioDeudaComponent } from '../usuario-deuda/usuario-deuda.component';
import { UsuarioHistorialComponent } from '../usuario-historial/usuario-historial.component';
import { UsuarioRequisitosComponent } from '../usuario-requisitos/usuario-requisitos.component';
import { UsuarioCartasComponent } from '../usuario-cartas/usuario-cartas.component';
import { UsuarioDocumentosComponent } from '../usuario-documentos/usuario-documentos.component';
import { UsuarioPagosComponent } from '../usuario-pagos/usuario-pagos.component';
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';
import { AuthService } from '../../../core/auth/auth.service';
import { AppCanDirective } from '../../../core/auth/app-can.directive';
import { FormatearNombrePipe } from '../../../shared/pipes/formatear-nombre.pipe';
import { FormatearFechaLargaPipe } from '../../../shared/pipes/formatear-fecha-larga.pipe';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';

const TAB_DEUDA = 0;
const TAB_HISTORIAL = 1;
const TAB_REQUISITOS = 2;
const TAB_CARTAS = 3;
const TAB_PAGOS = 4;
const TAB_DOCUMENTOS = 5;

@Component({
  selector: 'app-usuario-detail',
  standalone: true,
  imports: [
    NgClass,
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
    UsuarioPagosComponent,
    AppCanDirective,
    FormatearNombrePipe,
    FormatearFechaLargaPipe,
  ],
  templateUrl: './usuario-detail.component.html',
  styleUrl: './usuario-detail.component.scss',
})
export class UsuarioDetailComponent implements OnInit {
  usuario: UsuarioListItem | null = null;
  loading = false;
  editando = false;
  tabSeleccionado = 0;
  guardandoEstado = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly usuarios: UsuariosService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
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
    else if (tab === 'pagos') this.tabSeleccionado = TAB_PAGOS;
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

  /** AFILIADO viendo su propia cuenta: muestra tab Pagos (historial propio). */
  esAfiliadoEnMiCuenta(): boolean {
    const u = this.auth.currentUser();
    return !!(
      this.auth.hasRole('AFILIADO') &&
      u?.id &&
      this.usuario &&
      this.usuario.id === u.id
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

  /** Etiqueta legible para cada rol. */
  etiquetaRol(rol: string): string {
    const map: Record<string, string> = {
      ADMIN: 'Administrador',
      SECRETARIA: 'Secretaría',
      TESORERA: 'Tesorera',
      FISCAL: 'Fiscal',
      RECEPTOR_AGUA: 'Receptor de agua',
      AFILIADO: 'Afiliado',
    };
    return map[rol] ?? rol;
  }

  /** Índice de tab para ADMIN viendo otro (sin Cartas). */
  tabIndexAdmin(): number {
    if (this.tabSeleccionado === TAB_CARTAS) return 0;
    if (this.tabSeleccionado === TAB_DOCUMENTOS) return 3;
    return Math.min(this.tabSeleccionado, 3);
  }

  /** Dar de baja o reactivar usuario con confirmación explícita. */
  toggleActivo(): void {
    if (!this.usuario) return;
    const activoActual = this.usuario.activo;
    const nombre = `${this.usuario.nombres} ${this.usuario.apellidos}`;

    const titulo = activoActual ? 'Dar de baja al usuario' : 'Reactivar usuario';
    const mensaje = activoActual
      ? `¿Estás seguro de dar de baja a <strong>${nombre}</strong>? No podrá realizar pagos ni solicitar cartas.`
      : `¿Reactivar a <strong>${nombre}</strong>? El usuario podrá operar con normalidad.`;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo,
        mensaje,
        textoConfirmar: activoActual ? 'Dar de baja' : 'Reactivar',
        peligroso: activoActual,
      },
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado || !this.usuario) return;
      this.guardandoEstado = true;
      this.usuarios.actualizar(this.usuario.id, { activo: !activoActual }).subscribe({
        next: (actualizado) => {
          this.usuario = { ...this.usuario!, ...actualizado };
          this.guardandoEstado = false;
          const msg = activoActual ? 'Usuario dado de baja' : 'Usuario reactivado';
          this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          this.guardandoEstado = false;
          this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
        },
      });
    });
  }
}
