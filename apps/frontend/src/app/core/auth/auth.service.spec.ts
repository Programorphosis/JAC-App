import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService, AuthUser, AuthResult, RolNombre } from './auth.service';
import { PERMISSIONS } from './permissions.constants';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  const API = environment.apiUrl;

  const mockUser: AuthUser = {
    id: 'user-1',
    nombres: 'Carlos',
    apellidos: 'Gómez',
    numeroDocumento: '1234567890',
    juntaId: 'junta-1',
    roles: ['AFILIADO'],
    permissions: ['cartas:solicitar'],
  };

  const mockAuthResult: AuthResult = {
    accessToken: 'access-token-abc',
    refreshToken: 'refresh-token-xyz',
    expiresIn: 3600,
    user: mockUser,
  };

  function buildUser(overrides: Partial<AuthUser> = {}): AuthUser {
    return { ...mockUser, ...overrides };
  }

  function buildAuthResult(userOverrides: Partial<AuthUser> = {}): AuthResult {
    return { ...mockAuthResult, user: buildUser(userOverrides) };
  }

  function loginAs(userOverrides: Partial<AuthUser> = {}): void {
    const result = buildAuthResult(userOverrides);
    service
      .login({
        tipoDocumento: 'CC',
        numeroDocumento: '1234567890',
        password: 'pass123',
      })
      .subscribe();
    const req = httpMock.expectOne(`${API}/auth/login`);
    req.flush({ data: result });
  }

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: Router, useValue: router }],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  // ── 1. isAuthenticated ──────────────────────────────────────────────

  describe('isAuthenticated', () => {
    it('should be false initially (empty sessionStorage)', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should be true after login', () => {
      loginAs();
      expect(service.isAuthenticated()).toBeTrue();
    });
  });

  // ── 2. login ────────────────────────────────────────────────────────

  describe('login', () => {
    it('should POST to /auth/login and store tokens in sessionStorage', () => {
      const creds = {
        tipoDocumento: 'CC',
        numeroDocumento: '1234567890',
        password: 'secreto',
      };

      service.login(creds).subscribe((result) => {
        expect(result.accessToken).toBe('access-token-abc');
        expect(result.refreshToken).toBe('refresh-token-xyz');
        expect(result.user.id).toBe('user-1');
      });

      const req = httpMock.expectOne(`${API}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        tipoDocumento: 'CC',
        numeroDocumento: '1234567890',
        password: 'secreto',
      });
      req.flush({ data: mockAuthResult });

      expect(sessionStorage.getItem('jac_access_token')).toBe(
        'access-token-abc'
      );
      expect(sessionStorage.getItem('jac_refresh_token')).toBe(
        'refresh-token-xyz'
      );
      expect(
        JSON.parse(sessionStorage.getItem('jac_user')!)
      ).toEqual(mockUser);
    });

    it('should update user signal after login', () => {
      loginAs();
      expect(service.currentUser()).toEqual(mockUser);
    });

    it('should include juntaId when value is "platform"', () => {
      service
        .login({
          tipoDocumento: 'CC',
          numeroDocumento: '9999',
          password: 'p',
          juntaId: 'platform',
        })
        .subscribe();

      const req = httpMock.expectOne(`${API}/auth/login`);
      expect(req.request.body.juntaId).toBe('platform');
      req.flush({ data: mockAuthResult });
    });
  });

  // ── 3. logout ───────────────────────────────────────────────────────

  describe('logout', () => {
    it('should clear sessionStorage, set user to null and navigate to /login', () => {
      loginAs();
      expect(service.isAuthenticated()).toBeTrue();

      service.logout();

      expect(sessionStorage.getItem('jac_access_token')).toBeNull();
      expect(sessionStorage.getItem('jac_refresh_token')).toBeNull();
      expect(sessionStorage.getItem('jac_user')).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  // ── 4. getAccessToken / getRefreshToken ─────────────────────────────

  describe('getAccessToken / getRefreshToken', () => {
    it('should return null when not logged in', () => {
      expect(service.getAccessToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
    });

    it('should return tokens from sessionStorage after login', () => {
      loginAs();
      expect(service.getAccessToken()).toBe('access-token-abc');
      expect(service.getRefreshToken()).toBe('refresh-token-xyz');
    });
  });

  // ── 5. can() ────────────────────────────────────────────────────────

  describe('can()', () => {
    it('should return false when not authenticated', () => {
      expect(service.can(PERMISSIONS.USUARIOS_VER)).toBeFalse();
    });

    it('should return true when permission is in user.permissions array', () => {
      loginAs({ permissions: ['usuarios:ver', 'pagos:gestionar'] });
      expect(service.can(PERMISSIONS.USUARIOS_VER)).toBeTrue();
      expect(service.can(PERMISSIONS.PAGOS_GESTIONAR)).toBeTrue();
    });

    it('should return false when permission is NOT in user.permissions array', () => {
      loginAs({ permissions: ['usuarios:ver'] });
      expect(service.can(PERMISSIONS.PAGOS_GESTIONAR)).toBeFalse();
    });

    it('should fallback to role-based check when permissions array is missing', () => {
      loginAs({
        roles: ['TESORERA'],
        permissions: undefined,
      });
      expect(service.can(PERMISSIONS.PAGOS_GESTIONAR)).toBeTrue();
    });
  });

  // ── 6. canFallback (via can()) ──────────────────────────────────────

  describe('canFallback (role-based)', () => {
    function loginWithRoles(roles: RolNombre[], extra: Partial<AuthUser> = {}): void {
      loginAs({ roles, permissions: undefined, ...extra });
    }

    it('ADMIN should have USUARIOS_VER', () => {
      loginWithRoles(['ADMIN']);
      expect(service.can(PERMISSIONS.USUARIOS_VER)).toBeTrue();
    });

    it('TESORERA should have PAGOS_GESTIONAR', () => {
      loginWithRoles(['TESORERA']);
      expect(service.can(PERMISSIONS.PAGOS_GESTIONAR)).toBeTrue();
    });

    it('AFILIADO should have CARTAS_SOLICITAR', () => {
      loginWithRoles(['AFILIADO']);
      expect(service.can(PERMISSIONS.CARTAS_SOLICITAR)).toBeTrue();
    });

    it('AFILIADO should NOT have USUARIOS_CREAR', () => {
      loginWithRoles(['AFILIADO']);
      expect(service.can(PERMISSIONS.USUARIOS_CREAR)).toBeFalse();
    });

    it('SECRETARIA should have USUARIOS_CREAR', () => {
      loginWithRoles(['SECRETARIA']);
      expect(service.can(PERMISSIONS.USUARIOS_CREAR)).toBeTrue();
    });

    it('ADMIN should have USUARIOS_EDITAR_ROLES', () => {
      loginWithRoles(['ADMIN']);
      expect(service.can(PERMISSIONS.USUARIOS_EDITAR_ROLES)).toBeTrue();
    });

    it('SECRETARIA should NOT have USUARIOS_EDITAR_ROLES', () => {
      loginWithRoles(['SECRETARIA']);
      expect(service.can(PERMISSIONS.USUARIOS_EDITAR_ROLES)).toBeFalse();
    });

    it('FISCAL should have CARTAS_VER', () => {
      loginWithRoles(['FISCAL']);
      expect(service.can(PERMISSIONS.CARTAS_VER)).toBeTrue();
    });

    it('SECRETARIA should have CARTAS_VALIDAR', () => {
      loginWithRoles(['SECRETARIA']);
      expect(service.can(PERMISSIONS.CARTAS_VALIDAR)).toBeTrue();
    });

    it('ADMIN should have REQUISITOS_VER and REQUISITOS_MODIFICAR', () => {
      loginWithRoles(['ADMIN']);
      expect(service.can(PERMISSIONS.REQUISITOS_VER)).toBeTrue();
      expect(service.can(PERMISSIONS.REQUISITOS_MODIFICAR)).toBeTrue();
    });

    it('AFILIADO should NOT have REQUISITOS_VER', () => {
      loginWithRoles(['AFILIADO']);
      expect(service.can(PERMISSIONS.REQUISITOS_VER)).toBeFalse();
    });

    it('esModificador with juntaId should have USUARIOS_VER', () => {
      loginWithRoles(['AFILIADO'], {
        esModificador: true,
        juntaId: 'junta-1',
      });
      expect(service.can(PERMISSIONS.USUARIOS_VER)).toBeTrue();
    });

    it('unknown permission should return false', () => {
      loginWithRoles(['ADMIN']);
      expect(service.can('unknown:permission')).toBeFalse();
    });
  });

  // ── 7. canPagarOnlinePara ───────────────────────────────────────────

  describe('canPagarOnlinePara', () => {
    it('TESORERA can pay for anyone (via PAGOS_PAGAR_ONLINE)', () => {
      loginAs({
        id: 'tesorera-1',
        roles: ['TESORERA'],
        permissions: undefined,
      });
      expect(service.canPagarOnlinePara('otro-user')).toBeTrue();
      expect(service.canPagarOnlinePara('tesorera-1')).toBeTrue();
    });

    it('AFILIADO can pay only for self (via PAGOS_PAGAR_ONLINE_PROPIO)', () => {
      loginAs({
        id: 'afiliado-1',
        roles: ['AFILIADO'],
        permissions: undefined,
      });
      expect(service.canPagarOnlinePara('afiliado-1')).toBeTrue();
      expect(service.canPagarOnlinePara('otro-user')).toBeFalse();
    });

    it('SECRETARIA can pay only for self', () => {
      loginAs({
        id: 'secre-1',
        roles: ['SECRETARIA'],
        permissions: undefined,
      });
      expect(service.canPagarOnlinePara('secre-1')).toBeTrue();
      expect(service.canPagarOnlinePara('otro-user')).toBeFalse();
    });

    it('FISCAL cannot pay for anyone', () => {
      loginAs({
        id: 'fiscal-1',
        roles: ['FISCAL'],
        permissions: undefined,
      });
      expect(service.canPagarOnlinePara('fiscal-1')).toBeFalse();
    });
  });

  // ── 8. canSubirDocumentoPara ────────────────────────────────────────

  describe('canSubirDocumentoPara', () => {
    it('own user should always be true', () => {
      loginAs({ id: 'user-1', roles: ['AFILIADO'], permissions: [] });
      expect(service.canSubirDocumentoPara('user-1')).toBeTrue();
    });

    it('other user requires DOCUMENTOS_SUBIR_OTROS permission', () => {
      loginAs({
        id: 'user-1',
        roles: ['ADMIN'],
        permissions: ['documentos:subir:otros'],
      });
      expect(service.canSubirDocumentoPara('user-2')).toBeTrue();
    });

    it('other user without DOCUMENTOS_SUBIR_OTROS should be false', () => {
      loginAs({
        id: 'user-1',
        roles: ['AFILIADO'],
        permissions: [],
      });
      expect(service.canSubirDocumentoPara('user-2')).toBeFalse();
    });

    it('ADMIN fallback should allow subir otros', () => {
      loginAs({
        id: 'admin-1',
        roles: ['ADMIN'],
        permissions: undefined,
      });
      expect(service.canSubirDocumentoPara('otro-user')).toBeTrue();
    });
  });

  // ── 9. canVerCartas ─────────────────────────────────────────────────

  describe('canVerCartas', () => {
    it('should return true for CARTAS_VER (FISCAL)', () => {
      loginAs({ roles: ['FISCAL'], permissions: undefined });
      expect(service.canVerCartas()).toBeTrue();
    });

    it('should return true for CARTAS_VALIDAR (SECRETARIA)', () => {
      loginAs({ roles: ['SECRETARIA'], permissions: undefined });
      expect(service.canVerCartas()).toBeTrue();
    });

    it('should return false for user without either permission', () => {
      loginAs({ roles: ['AFILIADO'], permissions: undefined });
      expect(service.canVerCartas()).toBeFalse();
    });

    it('should work with explicit permissions array', () => {
      loginAs({ permissions: ['cartas:ver'] });
      expect(service.canVerCartas()).toBeTrue();
    });
  });

  // ── 10. esAdminSolo ─────────────────────────────────────────────────

  describe('esAdminSolo', () => {
    it('should return true for ADMIN-only', () => {
      loginAs({ roles: ['ADMIN'], permissions: [] });
      expect(service.esAdminSolo()).toBeTrue();
    });

    it('should return false for ADMIN + SECRETARIA', () => {
      loginAs({ roles: ['ADMIN', 'SECRETARIA'], permissions: [] });
      expect(service.esAdminSolo()).toBeFalse();
    });

    it('should return false for ADMIN + TESORERA', () => {
      loginAs({ roles: ['ADMIN', 'TESORERA'], permissions: [] });
      expect(service.esAdminSolo()).toBeFalse();
    });

    it('should return false for ADMIN + AFILIADO', () => {
      loginAs({ roles: ['ADMIN', 'AFILIADO'], permissions: [] });
      expect(service.esAdminSolo()).toBeFalse();
    });

    it('should return false for ADMIN + RECEPTOR_AGUA', () => {
      loginAs({ roles: ['ADMIN', 'RECEPTOR_AGUA'], permissions: [] });
      expect(service.esAdminSolo()).toBeFalse();
    });

    it('should return false for non-ADMIN (TESORERA only)', () => {
      loginAs({ roles: ['TESORERA'], permissions: [] });
      expect(service.esAdminSolo()).toBeFalse();
    });

    it('should return false when not authenticated', () => {
      expect(service.esAdminSolo()).toBeFalse();
    });

    it('should return true for ADMIN + FISCAL (FISCAL is not operativo)', () => {
      loginAs({ roles: ['ADMIN', 'FISCAL'], permissions: [] });
      expect(service.esAdminSolo()).toBeTrue();
    });
  });

  // ── 11. hasRole ─────────────────────────────────────────────────────

  describe('hasRole', () => {
    it('should return true when the user has the role', () => {
      loginAs({ roles: ['ADMIN', 'TESORERA'] });
      expect(service.hasRole('ADMIN')).toBeTrue();
      expect(service.hasRole('TESORERA')).toBeTrue();
    });

    it('should return false when the user does NOT have the role', () => {
      loginAs({ roles: ['AFILIADO'] });
      expect(service.hasRole('ADMIN')).toBeFalse();
    });

    it('should return false when not authenticated', () => {
      expect(service.hasRole('ADMIN')).toBeFalse();
    });
  });

  // ── 12. marcarPasswordCambiada ──────────────────────────────────────

  describe('marcarPasswordCambiada', () => {
    it('should update sessionStorage and signal', () => {
      loginAs({ requiereCambioPassword: true });
      expect(service.currentUser()?.requiereCambioPassword).toBeTrue();

      service.marcarPasswordCambiada();

      expect(service.currentUser()?.requiereCambioPassword).toBeFalse();
      const stored = JSON.parse(sessionStorage.getItem('jac_user')!);
      expect(stored.requiereCambioPassword).toBeFalse();
    });

    it('should do nothing when not authenticated', () => {
      service.marcarPasswordCambiada();
      expect(service.currentUser()).toBeNull();
    });
  });

  // ── 13. isPlatformAdmin ─────────────────────────────────────────────

  describe('isPlatformAdmin', () => {
    it('should be true for PLATFORM_ADMIN with null juntaId', () => {
      loginAs({
        roles: ['PLATFORM_ADMIN'],
        juntaId: null,
      });
      expect(service.isPlatformAdmin()).toBeTrue();
    });

    it('should be false for PLATFORM_ADMIN with a juntaId (impersonating)', () => {
      loginAs({
        roles: ['PLATFORM_ADMIN'],
        juntaId: 'junta-1',
      });
      expect(service.isPlatformAdmin()).toBeFalse();
    });

    it('should be false for regular user', () => {
      loginAs({ roles: ['ADMIN'], juntaId: 'junta-1' });
      expect(service.isPlatformAdmin()).toBeFalse();
    });

    it('should be false when not authenticated', () => {
      expect(service.isPlatformAdmin()).toBeFalse();
    });
  });

  // ── 14. isImpersonando ──────────────────────────────────────────────

  describe('isImpersonando', () => {
    it('should be true when impersonando flag is true', () => {
      loginAs({ impersonando: true });
      expect(service.isImpersonando()).toBeTrue();
    });

    it('should be false when impersonando flag is false', () => {
      loginAs({ impersonando: false });
      expect(service.isImpersonando()).toBeFalse();
    });

    it('should be false when impersonando is undefined', () => {
      loginAs({ impersonando: undefined });
      expect(service.isImpersonando()).toBeFalse();
    });

    it('should be false when not authenticated', () => {
      expect(service.isImpersonando()).toBeFalse();
    });
  });

  // ── Extras ──────────────────────────────────────────────────────────

  describe('refreshToken', () => {
    it('should return null when no refresh token exists', () => {
      service.refreshToken().subscribe((result) => {
        expect(result).toBeNull();
      });
    });

    it('should POST to /auth/refresh and update tokens', () => {
      loginAs();

      service.refreshToken().subscribe((result) => {
        expect(result).toBeTruthy();
        expect(result!.accessToken).toBe('new-access');
      });

      const req = httpMock.expectOne(`${API}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'refresh-token-xyz' });
      req.flush({
        data: {
          ...mockAuthResult,
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
        },
      });

      expect(service.getAccessToken()).toBe('new-access');
      expect(service.getRefreshToken()).toBe('new-refresh');
    });

    it('should logout on refresh failure', () => {
      loginAs();

      service.refreshToken().subscribe((result) => {
        expect(result).toBeNull();
      });

      const req = httpMock.expectOne(`${API}/auth/refresh`);
      req.flush('error', { status: 401, statusText: 'Unauthorized' });

      expect(service.isAuthenticated()).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('canSolicitarCartaPara', () => {
    it('should return true for own user with CARTAS_SOLICITAR', () => {
      loginAs({
        id: 'user-1',
        roles: ['AFILIADO'],
        permissions: ['cartas:solicitar'],
      });
      expect(service.canSolicitarCartaPara('user-1')).toBeTrue();
    });

    it('should return false for a different user', () => {
      loginAs({
        id: 'user-1',
        roles: ['AFILIADO'],
        permissions: ['cartas:solicitar'],
      });
      expect(service.canSolicitarCartaPara('user-2')).toBeFalse();
    });

    it('should return false for own user without CARTAS_SOLICITAR', () => {
      loginAs({
        id: 'user-1',
        roles: ['ADMIN'],
        permissions: [],
      });
      expect(service.canSolicitarCartaPara('user-1')).toBeFalse();
    });
  });

  describe('loadUserFromStorage (service init)', () => {
    it('should restore user from sessionStorage on service creation', () => {
      sessionStorage.setItem('jac_user', JSON.stringify(mockUser));
      sessionStorage.setItem('jac_access_token', 'tok');

      const freshService = new AuthService(
        TestBed.inject(HttpClientTestingModule) as any,
        router
      );

      expect(freshService.currentUser()).toEqual(mockUser);
      expect(freshService.isAuthenticated()).toBeTrue();
    });

    it('should handle corrupted sessionStorage gracefully', () => {
      sessionStorage.setItem('jac_user', '{invalid-json}');

      const freshService = new AuthService(
        TestBed.inject(HttpClientTestingModule) as any,
        router
      );

      expect(freshService.currentUser()).toBeNull();
      expect(freshService.isAuthenticated()).toBeFalse();
    });
  });
});
