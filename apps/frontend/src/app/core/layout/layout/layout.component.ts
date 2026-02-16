import { Component, inject, computed, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../auth/auth.service';
import { AppCanDirective } from '../../auth/app-can.directive';
import { FormatearNombrePipe } from '../../../shared/pipes/formatear-nombre.pipe';
import { map } from 'rxjs/operators';

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
    AppCanDirective,
    FormatearNombrePipe,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly breakpoint = inject(BreakpointObserver);
  /** Desktop: true por defecto. Móvil: false (el effect sincroniza). */
  menuOpen = true;

  readonly isSmallScreen = toSignal(
    this.breakpoint.observe([Breakpoints.Small, Breakpoints.XSmall]).pipe(map((b) => b.matches)),
    { initialValue: false }
  );

  /** En móvil: overlay. En desktop: side. */
  readonly sidenavMode = computed(() => (this.isSmallScreen() ? 'over' : 'side'));

  constructor() {
    // Desktop: sidenav abierto por defecto. Móvil: cerrado. Al cambiar breakpoint, sincronizar.
    effect(() => {
      this.menuOpen = !this.isSmallScreen();
    });
    if (this.auth.isPlatformAdmin() && this.router.url === '/') {
      this.router.navigate(['/platform']);
    }
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
}
