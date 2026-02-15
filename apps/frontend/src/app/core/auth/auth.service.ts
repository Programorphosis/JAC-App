import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export type RolNombre =
  | 'PLATFORM_ADMIN'
  | 'ADMIN'
  | 'SECRETARIA'
  | 'TESORERA'
  | 'RECEPTOR_AGUA'
  | 'CIUDADANO';

export interface AuthUser {
  id: string;
  nombres: string;
  apellidos: string;
  numeroDocumento: string;
  juntaId: string | null;
  roles: RolNombre[];
  esModificador?: boolean;
  requisitoTipoId?: string | null;
}

export interface LoginRequest {
  tipoDocumento: string;
  numeroDocumento: string;
  password: string;
  juntaId?: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

const STORAGE_ACCESS = 'jac_access_token';
const STORAGE_REFRESH = 'jac_refresh_token';
const STORAGE_USER = 'jac_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSignal = signal<AuthUser | null>(this.loadUserFromStorage());
  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly isPlatformAdmin = computed(
    () =>
      this.userSignal()?.juntaId === null &&
      this.userSignal()?.roles?.includes('PLATFORM_ADMIN') === true
  );

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  login(credenciales: LoginRequest): Observable<AuthResult> {
    const body: LoginRequest = {
      tipoDocumento: credenciales.tipoDocumento,
      numeroDocumento: credenciales.numeroDocumento,
      password: credenciales.password,
    };
    if (credenciales.juntaId === 'platform') {
      Object.assign(body, { juntaId: 'platform' });
    }

    return this.http
      .post<{ data: AuthResult }>(`${environment.apiUrl}/auth/login`, body)
      .pipe(
        tap((res) => this.handleAuthSuccess(res.data)),
        map((res) => res.data)
      );
  }

  logout(): void {
    sessionStorage.removeItem(STORAGE_ACCESS);
    sessionStorage.removeItem(STORAGE_REFRESH);
    sessionStorage.removeItem(STORAGE_USER);
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem(STORAGE_ACCESS);
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem(STORAGE_REFRESH);
  }

  refreshToken(): Observable<AuthResult | null> {
    const refresh = this.getRefreshToken();
    if (!refresh) {
      return of(null);
    }
    return this.http
      .post<{ data: AuthResult }>(`${environment.apiUrl}/auth/refresh`, {
        refreshToken: refresh,
      })
      .pipe(
        tap((res) => this.handleAuthSuccess(res.data)),
        map((res) => res.data),
        catchError(() => {
          this.logout();
          return of(null);
        })
      );
  }

  hasRole(rol: RolNombre): boolean {
    return this.userSignal()?.roles?.includes(rol) ?? false;
  }

  /** true si puede listar usuarios (ADMIN, SECRETARIA o modificador) */
  puedeVerUsuarios(): boolean {
    const u = this.userSignal();
    if (!u) return false;
    if (u.roles?.includes('ADMIN') || u.roles?.includes('SECRETARIA')) return true;
    return !!(u.esModificador && u.juntaId);
  }

  /** true si puede ver la configuración de requisitos (solo ADMIN crea/edita) */
  puedeVerRequisitos(): boolean {
    return this.hasRole('ADMIN');
  }

  /** true si puede registrar pagos y ver módulo Pagos (ADMIN, SECRETARIA, TESORERA) */
  puedeVerPagos(): boolean {
    return (
      this.hasRole('ADMIN') || this.hasRole('SECRETARIA') || this.hasRole('TESORERA')
    );
  }

  /** true si puede ver Tarifas (ADMIN, SECRETARIA, TESORERA) */
  puedeVerTarifas(): boolean {
    return (
      this.hasRole('ADMIN') || this.hasRole('SECRETARIA') || this.hasRole('TESORERA')
    );
  }

  /** true si puede ver Cartas pendientes y validar (solo ADMIN, SECRETARIA) */
  puedeVerCartasPendientes(): boolean {
    return this.hasRole('ADMIN') || this.hasRole('SECRETARIA');
  }

  private handleAuthSuccess(result: AuthResult): void {
    sessionStorage.setItem(STORAGE_ACCESS, result.accessToken);
    sessionStorage.setItem(STORAGE_REFRESH, result.refreshToken);
    sessionStorage.setItem(STORAGE_USER, JSON.stringify(result.user));
    this.userSignal.set(result.user);
  }

  private loadUserFromStorage(): AuthUser | null {
    const userStr = sessionStorage.getItem(STORAGE_USER);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as AuthUser;
    } catch {
      return null;
    }
  }
}
