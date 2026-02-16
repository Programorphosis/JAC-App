import { Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { PERMISSIONS } from './permissions.constants';

/**
 * Directiva estructural para mostrar contenido según permiso.
 * Uso: *appCan="'pagos:ver'"  o  *appCan="'pagos:pagarOnline'; usuarioId: usuarioId" (usuarioId mapea a appCanUsuarioId)
 */
@Directive({
  selector: '[appCan]',
  standalone: true,
})
export class AppCanDirective {
  private readonly auth = inject(AuthService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  @Input() set appCan(permission: string) {
    this.permission = permission;
    this.updateView();
  }

  @Input() set appCanUsuarioId(id: string) {
    this.usuarioId = id;
    this.updateView();
  }

  private permission = '';
  private usuarioId?: string;

  private updateView(): void {
    if (!this.permission) return;
    const granted = this.checkPermission();
    this.viewContainer.clear();
    if (granted) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }

  private checkPermission(): boolean {
    // Permisos con contexto usuarioId
    if (this.usuarioId !== undefined) {
      switch (this.permission) {
        case PERMISSIONS.PAGOS_PAGAR_ONLINE:
        case PERMISSIONS.PAGOS_PAGAR_ONLINE_PROPIO:
          return this.auth.canPagarOnlinePara(this.usuarioId);
        case PERMISSIONS.DOCUMENTOS_SUBIR_OTROS:
          return this.auth.canSubirDocumentoPara(this.usuarioId);
        case PERMISSIONS.CARTAS_SOLICITAR:
          return this.auth.canSolicitarCartaPara(this.usuarioId);
        case PERMISSIONS.HISTORIAL_CREAR:
          return this.auth.can(this.permission);
        default:
          return this.auth.can(this.permission);
      }
    }
    return this.auth.can(this.permission);
  }
}
