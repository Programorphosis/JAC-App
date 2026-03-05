import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RolNombre } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed-pw'),
}));

function makeUsuario(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    nombres: 'Juan',
    apellidos: 'Pérez',
    tipoDocumento: 'CC',
    numeroDocumento: '123456',
    passwordHash: 'hash-ok',
    juntaId: 'j1',
    activo: true,
    requiereCambioPassword: false,
    email: 'juan@test.com',
    emailVerificado: true,
    telefono: null,
    direccion: null,
    roles: [{ rol: { nombre: RolNombre.AFILIADO } }],
    requisitosComoModificador: [],
    junta: { activo: true, enMantenimiento: false },
    ...overrides,
  };
}

function createMocks() {
  const prisma: Record<string, any> = {
    usuario: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    junta: { findUnique: jest.fn() },
    codigoVerificacionEmail: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    codigoRecuperacion: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<void>) => fn(prisma)),
  };

  const jwt = {
    sign: jest.fn().mockReturnValue('token-signed'),
    verify: jest.fn(),
  };

  const audit = { registerEvent: jest.fn().mockResolvedValue(undefined) };
  const email = {
    enviarCodigoVerificacionEmail: jest.fn().mockResolvedValue(undefined),
    enviarCodigoRecuperacion: jest.fn().mockResolvedValue(undefined),
  };

  const service = new AuthService(
    prisma as any,
    jwt as any,
    audit as any,
    email as any,
  );

  return { service, prisma, jwt, audit, email };
}

// ─── login ───────────────────────────────────────────────────────

describe('AuthService – login', () => {
  it('debe retornar tokens y datos del usuario en login exitoso', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(makeUsuario());
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login({
      tipoDocumento: 'CC',
      numeroDocumento: '123456',
      password: 'pass',
    });

    expect(result.accessToken).toBe('token-signed');
    expect(result.refreshToken).toBe('token-signed');
    expect(result.expiresIn).toBe(900);
    expect(result.user.id).toBe('u1');
    expect(result.user.roles).toEqual([RolNombre.AFILIADO]);
    expect(result.user.esModificador).toBe(false);
  });

  it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(
      service.login({
        tipoDocumento: 'CC',
        numeroDocumento: '999',
        password: 'x',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('debe lanzar UnauthorizedException si el usuario está inactivo', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(makeUsuario({ activo: false }));

    await expect(
      service.login({
        tipoDocumento: 'CC',
        numeroDocumento: '123',
        password: 'x',
      }),
    ).rejects.toThrow('Credenciales inválidas');
  });

  it('debe lanzar UnauthorizedException si la junta no está activa', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(
      makeUsuario({ junta: { activo: false, enMantenimiento: false } }),
    );
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      service.login({
        tipoDocumento: 'CC',
        numeroDocumento: '123',
        password: 'x',
      }),
    ).rejects.toThrow('La junta no está activa');
  });

  it('debe lanzar UnauthorizedException si la junta está en mantenimiento', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(
      makeUsuario({ junta: { activo: true, enMantenimiento: true } }),
    );
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      service.login({
        tipoDocumento: 'CC',
        numeroDocumento: '123',
        password: 'x',
      }),
    ).rejects.toThrow('mantenimiento');
  });

  it('debe lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(makeUsuario());
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({
        tipoDocumento: 'CC',
        numeroDocumento: '123',
        password: 'wrong',
      }),
    ).rejects.toThrow('Credenciales inválidas');
  });

  it('debe registrar auditoría de login exitoso si tiene juntaId', async () => {
    const { service, prisma, audit } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(makeUsuario());
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await service.login({
      tipoDocumento: 'CC',
      numeroDocumento: '123',
      password: 'pass',
    });

    expect(audit.registerEvent).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'LOGIN_EXITOSO', juntaId: 'j1' }),
    );
  });

  it('no debe registrar auditoría si el usuario no tiene juntaId (platform admin)', async () => {
    const { service, prisma, audit } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(
      makeUsuario({
        juntaId: null,
        junta: null,
        roles: [{ rol: { nombre: RolNombre.PLATFORM_ADMIN } }],
      }),
    );
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await service.login({
      tipoDocumento: 'CC',
      numeroDocumento: '123',
      password: 'pass',
    });

    expect(audit.registerEvent).not.toHaveBeenCalled();
  });

  it('debe calcular esModificador=true si tiene requisitosComoModificador', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(
      makeUsuario({ requisitosComoModificador: [{ id: 'rt-1' }] }),
    );
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login({
      tipoDocumento: 'CC',
      numeroDocumento: '123',
      password: 'pass',
    });

    expect(result.user.esModificador).toBe(true);
    expect(result.user.requisitoTipoIds).toEqual(['rt-1']);
  });

  it('debe usar juntaId=null cuando dto.juntaId es "platform"', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(
      makeUsuario({
        juntaId: null,
        junta: null,
        roles: [{ rol: { nombre: RolNombre.PLATFORM_ADMIN } }],
      }),
    );
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await service.login({
      tipoDocumento: 'CC',
      numeroDocumento: '123',
      password: 'pass',
      juntaId: 'platform',
    });

    expect(prisma.usuario.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ juntaId: null }),
      }),
    );
  });
});

// ─── getProfile ──────────────────────────────────────────────────

describe('AuthService – getProfile', () => {
  it('debe retornar el perfil con roles mapeados', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(
      makeUsuario({
        roles: [{ rol: { nombre: RolNombre.ADMIN } }],
        requisitosComoModificador: [{ id: 'rt-1' }],
      }),
    );

    const result = await service.getProfile('u1');

    expect(result.roles).toEqual([RolNombre.ADMIN]);
    expect(result.esModificador).toBe(true);
    expect(result.requisitoTipoIds).toEqual(['rt-1']);
  });
});

// ─── validateRefreshToken ────────────────────────────────────────

describe('AuthService – validateRefreshToken', () => {
  it('debe emitir nuevos tokens con refresh token válido', async () => {
    const { service, prisma, jwt } = createMocks();
    jwt.verify.mockReturnValue({
      sub: 'u1',
      juntaId: 'j1',
      roles: [RolNombre.AFILIADO],
      tipo: 'refresh',
    });
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(makeUsuario());

    const result = await service.validateRefreshToken('valid-refresh');

    expect(result.accessToken).toBe('token-signed');
    expect(result.user.id).toBe('u1');
  });

  it('debe lanzar UnauthorizedException si el token no es tipo refresh', async () => {
    const { service, jwt } = createMocks();
    jwt.verify.mockReturnValue({ sub: 'u1', tipo: 'access' });

    await expect(service.validateRefreshToken('bad-type')).rejects.toThrow(
      'Token de refresco inválido',
    );
  });

  it('debe lanzar UnauthorizedException si el usuario está inactivo', async () => {
    const { service, prisma, jwt } = createMocks();
    jwt.verify.mockReturnValue({ sub: 'u1', tipo: 'refresh' });
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(
      makeUsuario({ activo: false }),
    );

    await expect(service.validateRefreshToken('token')).rejects.toThrow(
      'Token de refresco inválido',
    );
  });

  it('debe preservar impersonación en refresh', async () => {
    const { service, prisma, jwt } = createMocks();
    jwt.verify.mockReturnValue({
      sub: 'u1',
      juntaId: 'j-impersonada',
      roles: [RolNombre.PLATFORM_ADMIN],
      tipo: 'refresh',
      impersonando: true,
    });
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(
      makeUsuario({
        juntaId: null,
        roles: [{ rol: { nombre: RolNombre.PLATFORM_ADMIN } }],
      }),
    );

    const result = await service.validateRefreshToken('imp-refresh');

    expect(result.user.impersonando).toBe(true);
    expect(result.user.juntaId).toBe('j-impersonada');
  });

  it('debe lanzar UnauthorizedException si el token es inválido (verify lanza)', async () => {
    const { service, jwt } = createMocks();
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid');
    });

    await expect(service.validateRefreshToken('garbage')).rejects.toThrow(
      'Token de refresco inválido',
    );
  });
});

// ─── impersonar ──────────────────────────────────────────────────

describe('AuthService – impersonar', () => {
  it('debe generar tokens de impersonación para platform admin', async () => {
    const { service, prisma, audit } = createMocks();
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(
      makeUsuario({
        juntaId: null,
        roles: [{ rol: { nombre: RolNombre.PLATFORM_ADMIN } }],
      }),
    );
    prisma.junta.findUnique.mockResolvedValue({
      id: 'j2',
      nombre: 'Junta Test',
    });

    const result = await service.impersonar('u1', 'j2');

    expect(result.user.impersonando).toBe(true);
    expect(result.user.juntaId).toBe('j2');
    expect(result.user.esModificador).toBe(false);
    expect(audit.registerEvent).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'IMPERSONACION_INICIO' }),
    );
  });

  it('debe rechazar si el usuario tiene juntaId (no es platform admin puro)', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(
      makeUsuario({ roles: [{ rol: { nombre: RolNombre.PLATFORM_ADMIN } }] }),
    );
    prisma.junta.findUnique.mockResolvedValue({ id: 'j2' });

    await expect(service.impersonar('u1', 'j2')).rejects.toThrow(
      'Solo platform admin puede impersonar',
    );
  });

  it('debe rechazar si no tiene rol PLATFORM_ADMIN', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(
      makeUsuario({
        juntaId: null,
        roles: [{ rol: { nombre: RolNombre.ADMIN } }],
      }),
    );
    prisma.junta.findUnique.mockResolvedValue({ id: 'j2' });

    await expect(service.impersonar('u1', 'j2')).rejects.toThrow(
      'PLATFORM_ADMIN',
    );
  });

  it('debe rechazar si la junta no existe', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(
      makeUsuario({
        juntaId: null,
        roles: [{ rol: { nombre: RolNombre.PLATFORM_ADMIN } }],
      }),
    );
    prisma.junta.findUnique.mockResolvedValue(null);

    await expect(service.impersonar('u1', 'j-fake')).rejects.toThrow(
      'Junta no encontrada',
    );
  });
});

// ─── salirImpersonacion ──────────────────────────────────────────

describe('AuthService – salirImpersonacion', () => {
  it('debe restaurar tokens normales de platform admin', async () => {
    const { service, prisma, audit } = createMocks();
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(
      makeUsuario({
        juntaId: null,
        roles: [{ rol: { nombre: RolNombre.PLATFORM_ADMIN } }],
      }),
    );

    const result = await service.salirImpersonacion('u1', 'j-imp');

    expect(result.user.juntaId).toBeNull();
    expect(result.user.impersonando).toBeUndefined();
    expect(audit.registerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'IMPERSONACION_FIN',
        juntaId: 'j-imp',
      }),
    );
  });

  it('debe rechazar si el usuario tiene juntaId', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(makeUsuario());

    await expect(service.salirImpersonacion('u1', 'j1')).rejects.toThrow(
      'no es platform admin',
    );
  });
});

// ─── solicitarCodigoVerificacionEmail ────────────────────────────

describe('AuthService – solicitarCodigoVerificacionEmail', () => {
  it('debe enviar código de verificación', async () => {
    const { service, prisma, email } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(null); // no duplicado
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(makeUsuario());

    const result = await service.solicitarCodigoVerificacionEmail('u1', {
      email: 'nuevo@test.com',
    });

    expect(result.enviado).toBe(true);
    expect(prisma.codigoVerificacionEmail.create).toHaveBeenCalled();
    expect(email.enviarCodigoVerificacionEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'nuevo@test.com' }),
    );
  });

  it('debe rechazar email inválido', async () => {
    const { service } = createMocks();

    await expect(
      service.solicitarCodigoVerificacionEmail('u1', { email: 'no-valido' }),
    ).rejects.toThrow('no es válido');
  });

  it('debe rechazar si el email ya está registrado por otro usuario', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue({ id: 'otro' });

    await expect(
      service.solicitarCodigoVerificacionEmail('u1', {
        email: 'usado@test.com',
      }),
    ).rejects.toThrow(ConflictException);
  });
});

// ─── cambiarPassword ─────────────────────────────────────────────

describe('AuthService – cambiarPassword', () => {
  it('debe cambiar contraseña con passwordActual correcta (usuario normal)', async () => {
    const { service, prisma, audit } = createMocks();
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(makeUsuario());
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.cambiarPassword('u1', {
      passwordActual: 'oldpass',
      passwordNueva: 'newpass123',
    });

    expect(result.requiereCambioPassword).toBe(false);
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requiereCambioPassword: false }),
      }),
    );
    expect(audit.registerEvent).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'CAMBIO_PASSWORD' }),
    );
  });

  it('debe rechazar si la contraseña actual es incorrecta', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(makeUsuario());
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.cambiarPassword('u1', {
        passwordActual: 'wrongpass',
        passwordNueva: 'newpass',
      }),
    ).rejects.toThrow('Contraseña actual incorrecta');
  });

  it('debe rechazar si no envía passwordActual (usuario normal)', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(makeUsuario());

    await expect(
      service.cambiarPassword('u1', { passwordNueva: 'new' }),
    ).rejects.toThrow('Debes indicar tu contraseña actual');
  });

  it('debe exigir email + código si requiereCambioPassword=true', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(
      makeUsuario({ requiereCambioPassword: true }),
    );

    await expect(
      service.cambiarPassword('u1', { passwordNueva: 'new' }),
    ).rejects.toThrow('código de verificación');
  });

  it('debe cambiar contraseña y registrar email si requiereCambioPassword=true con código válido', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(
      makeUsuario({ requiereCambioPassword: true }),
    );
    prisma.codigoVerificacionEmail.findFirst.mockResolvedValue({ id: 'cod-1' });
    prisma.usuario.findFirst.mockResolvedValue(null); // email no duplicado

    const result = await service.cambiarPassword('u1', {
      passwordNueva: 'new',
      email: 'nuevo@test.com',
      codigo: '123456',
    });

    expect(result.requiereCambioPassword).toBe(false);
    expect(prisma.codigoVerificacionEmail.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { usado: true } }),
    );
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'nuevo@test.com',
          emailVerificado: true,
        }),
      }),
    );
  });

  it('debe rechazar código inválido o expirado', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(
      makeUsuario({ requiereCambioPassword: true }),
    );
    prisma.codigoVerificacionEmail.findFirst.mockResolvedValue(null);

    await expect(
      service.cambiarPassword('u1', {
        passwordNueva: 'new',
        email: 'test@test.com',
        codigo: '000000',
      }),
    ).rejects.toThrow('Código inválido o expirado');
  });

  it('debe rechazar si el email ya está en uso (cambio con código)', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(
      makeUsuario({ requiereCambioPassword: true }),
    );
    prisma.codigoVerificacionEmail.findFirst.mockResolvedValue({ id: 'cod-1' });
    prisma.usuario.findFirst.mockResolvedValue({ id: 'otro' });

    await expect(
      service.cambiarPassword('u1', {
        passwordNueva: 'new',
        email: 'usado@test.com',
        codigo: '123456',
      }),
    ).rejects.toThrow(ConflictException);
  });
});

// ─── solicitarCodigoRecuperacion ─────────────────────────────────

describe('AuthService – solicitarCodigoRecuperacion', () => {
  it('debe enviar código de recuperación si el usuario existe', async () => {
    const { service, prisma, email } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(makeUsuario());

    const result = await service.solicitarCodigoRecuperacion({
      email: 'juan@test.com',
    });

    expect(result.enviado).toBe(true);
    expect(prisma.codigoRecuperacion.create).toHaveBeenCalled();
    expect(email.enviarCodigoRecuperacion).toHaveBeenCalled();
  });

  it('debe retornar enviado=true aunque el email no exista (anti-enumeración)', async () => {
    const { service, prisma, email } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(null);

    const result = await service.solicitarCodigoRecuperacion({
      email: 'no@exist.com',
    });

    expect(result.enviado).toBe(true);
    expect(email.enviarCodigoRecuperacion).not.toHaveBeenCalled();
  });
});

// ─── verificarCodigoYRecuperar ───────────────────────────────────

describe('AuthService – verificarCodigoYRecuperar', () => {
  it('debe actualizar contraseña y marcar código como usado', async () => {
    const { service, prisma, audit } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(makeUsuario());
    prisma.codigoRecuperacion.findFirst.mockResolvedValue({ id: 'cod-rec-1' });

    await service.verificarCodigoYRecuperar({
      email: 'juan@test.com',
      codigo: '123456',
      passwordNueva: 'newpass',
    });

    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: 'hashed-pw',
          requiereCambioPassword: false,
        }),
      }),
    );
    expect(prisma.codigoRecuperacion.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { usado: true } }),
    );
    expect(audit.registerEvent).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'RECUPERACION_PASSWORD' }),
    );
  });

  it('debe lanzar NotFoundException si el usuario no existe', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(
      service.verificarCodigoYRecuperar({
        email: 'no@existe.com',
        codigo: '123',
        passwordNueva: 'new',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('debe lanzar BadRequestException si el código es inválido', async () => {
    const { service, prisma } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(makeUsuario());
    prisma.codigoRecuperacion.findFirst.mockResolvedValue(null);

    await expect(
      service.verificarCodigoYRecuperar({
        email: 'juan@test.com',
        codigo: '000000',
        passwordNueva: 'new',
      }),
    ).rejects.toThrow('Código inválido o expirado');
  });

  it('no debe registrar auditoría si el usuario no tiene juntaId', async () => {
    const { service, prisma, audit } = createMocks();
    prisma.usuario.findFirst.mockResolvedValue(makeUsuario({ juntaId: null }));
    prisma.codigoRecuperacion.findFirst.mockResolvedValue({ id: 'cod-1' });

    await service.verificarCodigoYRecuperar({
      email: 'juan@test.com',
      codigo: '123456',
      passwordNueva: 'new',
    });

    expect(audit.registerEvent).not.toHaveBeenCalled();
  });
});
