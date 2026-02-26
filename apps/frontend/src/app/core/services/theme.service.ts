import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private static readonly STORAGE_KEY = 'jac-theme';

  readonly isDark = signal(false);

  constructor() {
    const saved = localStorage.getItem(ThemeService.STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // Prioridad: preferencia guardada → preferencia del sistema → claro
    const shouldBeDark = saved === 'dark' || (saved === null && prefersDark);
    this.apply(shouldBeDark);
  }

  toggle(): void {
    this.apply(!this.isDark());
  }

  private apply(dark: boolean): void {
    this.isDark.set(dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem(ThemeService.STORAGE_KEY, dark ? 'dark' : 'light');
  }
}
