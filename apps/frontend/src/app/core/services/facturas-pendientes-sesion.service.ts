import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../auth/auth.service';
import { FacturasPlataformaService } from './facturas-plataforma.service';
import { FacturaPendienteModalComponent } from '../../shared/dialogs/factura-pendiente-modal/factura-pendiente-modal.component';

const STORAGE_KEY = 'jac_facturas_pendientes_sesion_mostrado';

/**
 * Muestra modal de facturas pendientes al abrir sesión.
 * Solo para ADMIN, SECRETARIA, TESORERA. Una vez por sesión.
 * Independiente de AvisosSesionService (sin dependencia entre módulos).
 */
@Injectable({ providedIn: 'root' })
export class FacturasPendientesSesionService {
  constructor(
    private readonly facturas: FacturasPlataformaService,
    private readonly auth: AuthService,
    private readonly dialog: MatDialog
  ) {}

  /**
   * Muestra el modal si hay facturas pendientes y no se ha mostrado en esta sesión.
   * Debe llamarse después de AvisosSesionService (en secuencia).
   */
  mostrarSiHayPendientes(): void {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') {
      return;
    }
    if (!this.debeMostrar()) {
      return;
    }
    this.facturas.listarPendientes().subscribe({
      next: (facturas) => {
        if (facturas.length > 0) {
          sessionStorage.setItem(STORAGE_KEY, '1');
          this.dialog.open(FacturaPendienteModalComponent, {
            data: { facturas },
            width: 'min(480px, 95vw)',
            disableClose: false,
            panelClass: 'factura-pendiente-modal-panel',
          });
        }
      },
    });
  }

  private debeMostrar(): boolean {
    if (this.auth.isPlatformAdmin() && !this.auth.isImpersonando()) {
      return false;
    }
    if (!this.auth.currentUser()?.juntaId) {
      return false;
    }
    return (
      this.auth.hasRole('ADMIN') ||
      this.auth.hasRole('SECRETARIA') ||
      this.auth.hasRole('TESORERA')
    );
  }
}
