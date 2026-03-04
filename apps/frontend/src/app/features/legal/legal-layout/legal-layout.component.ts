import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { LegalNavService } from '../services/legal-nav.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-legal-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './legal-layout.component.html',
  styleUrl: './legal-layout.component.scss',
})
export class LegalLayoutComponent implements OnInit, OnDestroy {
  protected readonly nav = inject(LegalNavService);
  private readonly breakpoint = inject(BreakpointObserver);
  private readonly destroy$ = new Subject<void>();

  protected isMobile = signal(false);

  ngOnInit(): void {
    this.breakpoint
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait, '(max-width: 960px)'])
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.isMobile.set(state.matches);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  scrollToSection(id: string) {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  closeIfMobile(sidenav: MatSidenav) {
    if (this.isMobile()) {
      sidenav.close();
    }
  }
}
