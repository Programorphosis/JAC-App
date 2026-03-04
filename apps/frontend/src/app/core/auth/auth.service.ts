import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PERMISSIONS, type Permission } from './permissions.constants';

export type RolNombre =
  | 'PLATFORM_ADMIN'
  | 'ADMIN'
  | 'SECRETARIA'
  | 'TESORERA'
  | 'FISCAL'
  | 'RECEPTOR_AGUA'
  | 'AFILIADO';

export interface AuthUser {
  id: string;
  nombres: string;
  apellidos: string;
  numeroDocumento: string;
  juntaId: string | null;
  roles: RolNombre[];
  /** Permisos explícitos desde backend. Fuente de verdad para can(). */
  permissions?: string[];
  esModificador?: boolean;
  requisitoTipoIds?: string[];
  /** @deprecated Mantenido para compatibilidad. */
  requisitoTipoId?: string | null;
  /** PA-8: true cuando platform admin está viendo como junta (solo lectura). */
  impersonando?: boolean;
  /** true = debe cambiar contraseña en primer login (y registrar email). */
  requiereCambioPassword?: boolean;
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
  /** Constantes para uso en templates: auth.permissions.USUARIOS_VER */
  readonly permissions = PERMISSIONS;
  readonly isPlatformAdmin = computed(
    () =>
      this.userSignal()?.juntaId === null &&
      this.userSignal()?.roles?.includes('PLATFORM_ADMIN') === true
  );

  /** PA-8: true cuando está en modo impersonación (viendo como junta). */
  readonly isImpersonando = computed(() => this.userSignal()?.impersonando === true);

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
    sessionStorage.removeItem('jac_avisos_sesion_mostrados');
    sessionStorage.removeItem('jac_facturas_pendientes_sesion_mostrado');
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

  /**
   * Verifica si el usuario tiene el permiso indicado.
   * Usa el array permissions del JWT (backend). Fallback a roles si permissions no existe (sesiones antiguas).
   */
  can(permission: Permission | string): boolean {
    const u = this.userSignal();
    if (!u) return false;
    const perms = u.permissions;
    if (Array.isArray(perms) && perms.includes(permission)) return true;
    // Fallback para sesiones sin permissions (re-login actualizará)
    return this.canFallback(permission, u);
  }

  private canFallback(permission: string, u: AuthUser): boolean {
    const has = (r: RolNombre) => u.roles?.includes(r) ?? false;
    switch (permission) {
      case PERMISSIONS.USUARIOS_VER: {
        const esMod = u.esModificador ?? ((u.requisitoTipoIds?.length ?? 0) > 0 || !!u.requisitoTipoId);
        return has('ADMIN') || has('SECRETARIA') || has('TESORERA') || !!(esMod && u.juntaId);
      }
      case PERMISSIONS.USUARIOS_CREAR:
      case PERMISSIONS.USUARIOS_EDITAR:
        return has('ADMIN') || has('SECRETARIA');
      case PERMISSIONS.USUARIOS_EDITAR_ROLES:
        return has('ADMIN');
      case PERMISSIONS.REQUISITOS_VER:
      case PERMISSIONS.REQUISITOS_MODIFICAR:
        return has('ADMIN');
      case PERMISSIONS.PAGOS_GESTIONAR:
        return has('TESORERA');
      case PERMISSIONS.PAGOS_VER:
        return has('TESORERA') || has('ADMIN') || has('SECRETARIA') || has('FISCAL');
      case PERMISSIONS.PAGOS_PAGAR_ONLINE:
        return has('TESORERA');
      case PERMISSIONS.PAGOS_PAGAR_ONLINE_PROPIO:
        return has('AFILIADO') || has('SECRETARIA');
      case PERMISSIONS.TARIFAS_VER:
        return has('ADMIN') || has('SECRETARIA') || has('TESORERA') || has('FISCAL');
      case PERMISSIONS.TARIFAS_MODIFICAR:
        return has('TESORERA');
      case PERMISSIONS.CARTAS_VER:
        return has('FISCAL');
      case PERMISSIONS.CARTAS_VALIDAR:
        return has('SECRETARIA');
      case PERMISSIONS.CARTAS_SOLICITAR:
        return has('AFILIADO');
      case PERMISSIONS.AUDITORIAS_VER:
        return has('ADMIN') || has('SECRETARIA') || has('TESORERA') || has('FISCAL');
      case PERMISSIONS.DOCUMENTOS_SUBIR_OTROS:
        return has('ADMIN') || has('TESORERA');
      case PERMISSIONS.HISTORIAL_CREAR:
        return has('ADMIN') || has('TESORERA');
      case PERMISSIONS.JUNTA_CONFIG_WOMPI:
        return has('ADMIN');
      case PERMISSIONS.JUNTA_SUSCRIPCION_GESTIONAR:
        return has('TESORERA');
      case PERMISSIONS.AVISOS_JUNTA_GESTIONAR:
        return has('ADMIN') || has('SECRETARIA');
      default:
        return false;
    }
  }

  /** Permisos que requieren contexto usuarioId. TESORERA: cualquiera; AFILIADO/SECRETARIA: solo propio. */
  canPagarOnlinePara(usuarioId: string): boolean {
    return this.can(PERMISSIONS.PAGOS_PAGAR_ONLINE) || (this.can(PERMISSIONS.PAGOS_PAGAR_ONLINE_PROPIO) && this.currentUser()?.id === usuarioId);
  }

  /** Propio siempre; otros si tiene documentos:subir:otros. */
  canSubirDocumentoPara(usuarioId: string): boolean {
    return this.currentUser()?.id === usuarioId || this.can(PERMISSIONS.DOCUMENTOS_SUBIR_OTROS);
  }

  /** Ver cartas (listar pendientes, descargar): CARTAS_VER o CARTAS_VALIDAR. */
  canVerCartas(): boolean {
    return this.can(PERMISSIONS.CARTAS_VER) || this.can(PERMISSIONS.CARTAS_VALIDAR);
  }

  /** Solo propio y con cartas:solicitar. */
  canSolicitarCartaPara(usuarioId: string): boolean {
    return this.currentUser()?.id === usuarioId && this.can(PERMISSIONS.CARTAS_SOLICITAR);
  }

  /** ADMIN sin roles operativos (solo configuración). Usado para lógica de tabs. */
  esAdminSolo(): boolean {
    const u = this.userSignal();
    if (!u) return false;
    const tieneAdmin = u.roles?.includes('ADMIN') ?? false;
    const tieneOperativo =
      u.roles?.includes('SECRETARIA') ||
      u.roles?.includes('TESORERA') ||
      u.roles?.includes('RECEPTOR_AGUA') ||
      u.roles?.includes('AFILIADO');
    return tieneAdmin && !tieneOperativo;
  }

  hasRole(rol: RolNombre): boolean {
    return this.userSignal()?.roles?.includes(rol) ?? false;
  }

  /** PA-8: Impersonar junta (platform admin). Navega a /app tras éxito. */
  impersonar(juntaId: string): Observable<AuthResult> {
    return this.http
      .post<{ data: AuthResult }>(`${environment.apiUrl}/platform/impersonar/${juntaId}`, {})
      .pipe(
        tap((res) => this.handleAuthSuccess(res.data)),
        map((res) => res.data)
      );
  }

  /** PA-8: Salir de impersonación. Restaura tokens de platform admin. */
  salirImpersonacion(): Observable<AuthResult> {
    return this.http
      .post<{ data: AuthResult }>(`${environment.apiUrl}/platform/salir-impersonacion`, {})
      .pipe(
        tap((res) => this.handleAuthSuccess(res.data)),
        map((res) => res.data)
      );
  }

  /** Actualiza requiereCambioPassword en el usuario almacenado (tras cambiar contraseña). */
  marcarPasswordCambiada(): void {
    const u = this.userSignal();
    if (u) {
      const updated = { ...u, requiereCambioPassword: false };
      sessionStorage.setItem(STORAGE_USER, JSON.stringify(updated));
      this.userSignal.set(updated);
    }
  }

  /** Solicitar código de verificación al email (primer login, para agregar correo). */
  solicitarVerificacionEmail(email: string): Observable<{ enviado: boolean }> {
    return this.http
      .post<{ data: { enviado: boolean } }>(
        `${environment.apiUrl}/auth/solicitar-verificacion-email`,
        { email }
      )
      .pipe(map((res) => res.data));
  }

  /** Cambiar contraseña (autenticado). passwordActual opcional cuando requiereCambioPassword. codigo obligatorio cuando requiereCambioPassword. */
  cambiarPassword(dto: {
    passwordActual?: string;
    passwordNueva: string;
    email?: string;
    codigo?: string;
  }): Observable<{ requiereCambioPassword: boolean }> {
    return this.http
      .patch<{ data: { requiereCambioPassword: boolean } }>(
        `${environment.apiUrl}/auth/cambiar-password`,
        dto
      )
      .pipe(map((res) => res.data));
  }

  /** Solicitar código de recuperación al email. */
  solicitarCodigoRecuperacion(email: string): Observable<{ enviado: boolean }> {
    return this.http
      .post<{ data: { enviado: boolean } }>(
        `${environment.apiUrl}/auth/olvide-contrasena`,
        { email }
      )
      .pipe(map((res) => res.data));
  }

  /** Verificar código y establecer nueva contraseña. */
  verificarCodigoRecuperacion(dto: {
    email: string;
    codigo: string;
    passwordNueva: string;
  }): Observable<void> {
    return this.http
      .post<{ data: { ok: boolean } }>(
        `${environment.apiUrl}/auth/olvide-contrasena/verificar`,
        dto
      )
      .pipe(map(() => undefined));
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
