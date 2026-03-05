import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolNombre } from '@prisma/client';
import type { JwtUser } from '../strategies/jwt.strategy';
import { JuntaGuard } from './junta.guard';
import { RolesGuard } from './roles.guard';
import { PlatformAdminGuard } from './platform-admin.guard';
import { UsuarioPropioOAdminGuard } from './usuario-propio-o-admin.guard';
import { ModificadorOAdminGuard } from './modificador-o-admin.guard';
import { ModificadorSoloGuard } from './modificador-solo.guard';
import { ImpersonacionSalirGuard } from './impersonacion-salir.guard';

function baseUser(overrides: Partial<JwtUser> = {}): JwtUser {
  return {
    id: 'u1',
    juntaId: 'j1',
    roles: [RolNombre.AFILIADO],
    esModificador: false,
    requisitoTipoIds: [],
    ...overrides,
  };
}

function mockContext(
  user?: JwtUser,
  params: Record<string, string> = {},
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, params }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

// ─── JuntaGuard ──────────────────────────────────────────────────

describe('JuntaGuard', () => {
  const guard = new JuntaGuard();

  it('debe permitir si el usuario tiene juntaId', () => {
    expect(guard.canActivate(mockContext(baseUser()))).toBe(true);
  });

  it('debe rechazar si no hay usuario', () => {
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('debe rechazar si juntaId es null (platform admin)', () => {
    const user = baseUser({ juntaId: null, roles: [RolNombre.PLATFORM_ADMIN] });
    expect(() => guard.canActivate(mockContext(user))).toThrow(
      'pertenecer a una junta',
    );
  });

  it('debe rechazar si juntaId es undefined', () => {
    const user = baseUser({ juntaId: undefined as unknown as null });
    expect(() => guard.canActivate(mockContext(user))).toThrow(
      ForbiddenException,
    );
  });
});

// ─── RolesGuard ──────────────────────────────────────────────────

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('debe permitir si no hay roles requeridos', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(mockContext(baseUser()))).toBe(true);
  });

  it('debe permitir si roles requeridos es array vacío', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    expect(guard.canActivate(mockContext(baseUser()))).toBe(true);
  });

  it('debe permitir si el usuario tiene el rol requerido', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([RolNombre.ADMIN]);
    const user = baseUser({ roles: [RolNombre.ADMIN] });
    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('debe permitir si el usuario tiene uno de varios roles requeridos', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([RolNombre.ADMIN, RolNombre.SECRETARIA]);
    const user = baseUser({ roles: [RolNombre.SECRETARIA] });
    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('debe rechazar si el usuario no tiene el rol', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([RolNombre.ADMIN]);
    const user = baseUser({ roles: [RolNombre.AFILIADO] });
    expect(() => guard.canActivate(mockContext(user))).toThrow(
      'Se requiere uno de los roles',
    );
  });

  it('debe rechazar si no hay usuario', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([RolNombre.ADMIN]);
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(
      'No autenticado',
    );
  });
});

// ─── PlatformAdminGuard ──────────────────────────────────────────

describe('PlatformAdminGuard', () => {
  let guard: PlatformAdminGuard;

  beforeEach(() => {
    guard = new PlatformAdminGuard(new Reflector());
  });

  it('debe permitir si es PLATFORM_ADMIN con juntaId null', () => {
    const user = baseUser({ roles: [RolNombre.PLATFORM_ADMIN], juntaId: null });
    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('debe rechazar si es PLATFORM_ADMIN pero con juntaId (impersonando)', () => {
    const user = baseUser({ roles: [RolNombre.PLATFORM_ADMIN], juntaId: 'j1' });
    expect(() => guard.canActivate(mockContext(user))).toThrow(
      'PLATFORM_ADMIN',
    );
  });

  it('debe rechazar si es ADMIN de junta', () => {
    const user = baseUser({ roles: [RolNombre.ADMIN] });
    expect(() => guard.canActivate(mockContext(user))).toThrow(
      'PLATFORM_ADMIN',
    );
  });

  it('debe rechazar si no hay usuario', () => {
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(
      'No autenticado',
    );
  });
});

// ─── UsuarioPropioOAdminGuard ────────────────────────────────────

describe('UsuarioPropioOAdminGuard', () => {
  const guard = new UsuarioPropioOAdminGuard();

  it('debe permitir si accede a su propio recurso', () => {
    const user = baseUser({ id: 'u1' });
    expect(guard.canActivate(mockContext(user, { id: 'u1' }))).toBe(true);
  });

  it('debe permitir a ADMIN para otro usuario', () => {
    const user = baseUser({ roles: [RolNombre.ADMIN] });
    expect(guard.canActivate(mockContext(user, { id: 'otro' }))).toBe(true);
  });

  it('debe permitir a SECRETARIA para otro usuario', () => {
    const user = baseUser({ roles: [RolNombre.SECRETARIA] });
    expect(guard.canActivate(mockContext(user, { id: 'otro' }))).toBe(true);
  });

  it('debe permitir a TESORERA para otro usuario', () => {
    const user = baseUser({ roles: [RolNombre.TESORERA] });
    expect(guard.canActivate(mockContext(user, { id: 'otro' }))).toBe(true);
  });

  it('debe permitir a FISCAL para otro usuario', () => {
    const user = baseUser({ roles: [RolNombre.FISCAL] });
    expect(guard.canActivate(mockContext(user, { id: 'otro' }))).toBe(true);
  });

  it('debe permitir a modificador con junta para otro usuario', () => {
    const user = baseUser({
      esModificador: true,
      juntaId: 'j1',
      roles: [RolNombre.AFILIADO],
    });
    expect(guard.canActivate(mockContext(user, { id: 'otro' }))).toBe(true);
  });

  it('debe rechazar si es AFILIADO normal accediendo a otro usuario', () => {
    const user = baseUser({ roles: [RolNombre.AFILIADO] });
    expect(() => guard.canActivate(mockContext(user, { id: 'otro' }))).toThrow(
      ForbiddenException,
    );
  });

  it('debe rechazar si no hay usuario', () => {
    expect(() =>
      guard.canActivate(mockContext(undefined, { id: 'u1' })),
    ).toThrow('No autenticado');
  });
});

// ─── ModificadorOAdminGuard ──────────────────────────────────────

describe('ModificadorOAdminGuard', () => {
  const guard = new ModificadorOAdminGuard();

  it('debe permitir a ADMIN', () => {
    const user = baseUser({ roles: [RolNombre.ADMIN] });
    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('debe permitir a SECRETARIA', () => {
    const user = baseUser({ roles: [RolNombre.SECRETARIA] });
    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('debe permitir a TESORERA', () => {
    const user = baseUser({ roles: [RolNombre.TESORERA] });
    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('debe permitir a FISCAL', () => {
    const user = baseUser({ roles: [RolNombre.FISCAL] });
    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('debe permitir a modificador con junta', () => {
    const user = baseUser({
      esModificador: true,
      juntaId: 'j1',
      roles: [RolNombre.AFILIADO],
    });
    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('debe rechazar a AFILIADO sin ser modificador', () => {
    const user = baseUser({ roles: [RolNombre.AFILIADO] });
    expect(() => guard.canActivate(mockContext(user))).toThrow(
      ForbiddenException,
    );
  });

  it('debe rechazar si no hay usuario', () => {
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(
      'No autenticado',
    );
  });
});

// ─── ModificadorSoloGuard ────────────────────────────────────────

describe('ModificadorSoloGuard', () => {
  const guard = new ModificadorSoloGuard();

  it('debe permitir a modificador con junta', () => {
    const user = baseUser({ esModificador: true, juntaId: 'j1' });
    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('debe rechazar si no es modificador', () => {
    const user = baseUser({ esModificador: false });
    expect(() => guard.canActivate(mockContext(user))).toThrow(
      'modificador asignado',
    );
  });

  it('debe rechazar si es modificador pero sin junta', () => {
    const user = baseUser({ esModificador: true, juntaId: null });
    expect(() => guard.canActivate(mockContext(user))).toThrow(
      ForbiddenException,
    );
  });

  it('debe rechazar si no hay usuario', () => {
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(
      'No autenticado',
    );
  });
});

// ─── ImpersonacionSalirGuard ─────────────────────────────────────

describe('ImpersonacionSalirGuard', () => {
  const guard = new ImpersonacionSalirGuard();

  it('debe permitir si está impersonando', () => {
    const user = baseUser({ impersonando: true });
    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('debe rechazar si no está impersonando', () => {
    const user = baseUser({ impersonando: false });
    expect(() => guard.canActivate(mockContext(user))).toThrow(
      'No está en modo impersonación',
    );
  });

  it('debe rechazar si impersonando es undefined', () => {
    const user = baseUser();
    expect(() => guard.canActivate(mockContext(user))).toThrow(
      ForbiddenException,
    );
  });

  it('debe rechazar si no hay usuario', () => {
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(
      'No autenticado',
    );
  });
});
