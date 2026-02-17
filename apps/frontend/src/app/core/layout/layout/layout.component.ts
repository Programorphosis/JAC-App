import { Component, inject, computed, effect, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../auth/auth.service';
import { AppCanDirective } from '../../auth/app-can.directive';
import { FormatearNombrePipe } from '../../../shared/pipes/formatear-nombre.pipe';
import { AvisosSesionService } from '../../services/avisos-sesion.service';
import { FacturasPendientesSesionService } from '../../services/facturas-pendientes-sesion.service';
import { map } from 'rxjs/operators';
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    AppCanDirective,
    FormatearNombrePipe,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly breakpoint = inject(BreakpointObserver);
  private readonly avisosSesion = inject(AvisosSesionService);
  private readonly facturasPendientesSesion = inject(FacturasPendientesSesionService);
  /** Desktop: true por defecto. Móvil: false (el effect sincroniza). */
  menuOpen = true;

  readonly isSmallScreen = toSignal(
    this.breakpoint.observe([Breakpoints.Small, Breakpoints.XSmall]).pipe(map((b) => b.matches)),
    { initialValue: false }
  );

  /** En móvil: overlay. En desktop: side. */
  readonly sidenavMode = computed(() => (this.isSmallScreen() ? 'over' : 'side'));

  saliendoImpersonacion = false;

  constructor() {
    // Desktop: sidenav abierto por defecto. Móvil: cerrado. Al cambiar breakpoint, sincronizar.
    effect(() => {
      this.menuOpen = !this.isSmallScreen();
    });
    if (this.auth.isPlatformAdmin() && this.router.url === '/') {
      this.router.navigate(['/platform']);
    }
  }

  ngOnInit(): void {
    // Avisos al abrir sesión, luego facturas pendientes (modales independientes, orquestados aquí)
    setTimeout(() => {
      this.avisosSesion.mostrarAlAbrirSesion(() => {
        this.facturasPendientesSesion.mostrarSiHayPendientes();
      });
    }, 600);
  }

  logout(): void {
    this.auth.logout();
  }

  /** En móvil: cerrar al elegir opción. En desktop: no hacer nada. */
  onNavItemClick(): void {
    if (this.isSmallScreen()) {
      this.menuOpen = false;
    }
  }

  /** PA-8: Salir de impersonación y volver a platform. */
  salirImpersonacion(): void {
    this.saliendoImpersonacion = true;
    this.auth.salirImpersonacion().subscribe({
      next: () => {
        this.saliendoImpersonacion = false;
        this.router.navigate(['/platform']);
      },
      error: (err) => {
        this.saliendoImpersonacion = false;
        this.snackBar.open(getApiErrorMessage(err) || 'Error al salir de impersonación', 'Cerrar', {
          duration: 5000,
        });
      },
    });
  }
}
