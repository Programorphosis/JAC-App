import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { AvisoModalComponent, AvisoModalData } from '../../shared/dialogs/aviso-modal/aviso-modal.component';

interface AvisoItem {
  id: string;
  titulo: string;
  contenido: string;
  fechaPublicacion: string;
  activo: boolean;
  alcance?: string;
}

const STORAGE_KEY = 'jac_avisos_sesion_mostrados';

/**
 * Muestra avisos en modal al abrir sesión (estilo evento de juego).
 * Una vez por sesión del navegador.
 */
@Injectable({ providedIn: 'root' })
export class AvisosSesionService {
  private readonly avisosBase = `${environment.apiUrl}/avisos`;
  private readonly platformAvisosBase = `${environment.apiUrl}/platform/avisos`;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    private readonly dialog: MatDialog
  ) {}

  /**
   * Muestra los avisos en secuencia (uno tras otro al cerrar).
   * Solo si no se han mostrado ya en esta sesión.
   */
  mostrarAlAbrirSesion(onComplete?: () => void): void {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') {
      onComplete?.();
      return;
    }
    this.obtenerAvisosParaModal().subscribe({
      next: (avisos) => {
        if (avisos.length > 0) {
          sessionStorage.setItem(STORAGE_KEY, '1');
          this.mostrarSiguiente(avisos, 0, onComplete);
        } else {
          onComplete?.();
        }
      },
      error: () => onComplete?.(),
    });
  }

  private obtenerAvisosParaModal(): Observable<AvisoItem[]> {
    const esAdminPlataforma = this.auth.isPlatformAdmin() && !this.auth.isImpersonando();
    if (esAdminPlataforma) {
      return this.http
        .get<{ data: AvisoItem[] }>(this.platformAvisosBase, { params: { activo: 'true' } })
        .pipe(
          map((r) => r.data.filter((a) => a.alcance === 'PLATAFORMA'))
        );
    }
    return this.http
      .get<{ data: AvisoItem[] }>(this.avisosBase)
      .pipe(map((r) => r.data));
  }

  private mostrarSiguiente(
    avisos: AvisoItem[],
    indice: number,
    onComplete?: () => void
  ): void {
    if (indice >= avisos.length) {
      onComplete?.();
      return;
    }
    const a = avisos[indice];
    const data: AvisoModalData = {
      titulo: a.titulo,
      contenido: a.contenido,
      fechaPublicacion: a.fechaPublicacion,
      indice: indice + 1,
      total: avisos.length,
    };
    const ref = this.dialog.open(AvisoModalComponent, {
      data,
      width: 'min(480px, 95vw)',
      disableClose: false,
      panelClass: 'aviso-modal-panel',
    });
    ref.afterClosed().subscribe(() => {
      this.mostrarSiguiente(avisos, indice + 1, onComplete);
    });
  }
}
