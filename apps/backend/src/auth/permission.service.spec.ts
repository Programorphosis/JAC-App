import { RolNombre } from '@prisma/client';
import type { JwtUser } from './strategies/jwt.strategy';
import { PermissionService } from './permission.service';

function makeUser(overrides: Partial<JwtUser> = {}): JwtUser {
  return {
    id: 'u1',
    juntaId: 'j1',
    roles: [RolNombre.AFILIADO],
    esModificador: false,
    requisitoTipoIds: [],
    ...overrides,
  };
}

describe('PermissionService', () => {
  const svc = new PermissionService();

  // ─── puedeConsultarRecursoDeOtro ────────────────────────
  describe('puedeConsultarRecursoDeOtro', () => {
    it.each([RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.FISCAL])(
      'debe permitir a %s',
      (rol) => {
        expect(svc.puedeConsultarRecursoDeOtro(makeUser({ roles: [rol] }))).toBe(true);
      },
    );

    it('debe permitir a modificador con junta', () => {
      expect(svc.puedeConsultarRecursoDeOtro(makeUser({ esModificador: true }))).toBe(true);
    });

    it('debe negar a AFILIADO', () => {
      expect(svc.puedeConsultarRecursoDeOtro(makeUser())).toBe(false);
    });

    it('debe negar si juntaId es null', () => {
      expect(svc.puedeConsultarRecursoDeOtro(makeUser({ juntaId: null, roles: [RolNombre.ADMIN] }))).toBe(false);
    });
  });

  // ─── puedeVerHistorialDeOtro ────────────────────────────
  describe('puedeVerHistorialDeOtro', () => {
    it.each([RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.FISCAL])(
      'debe permitir a %s',
      (rol) => {
        expect(svc.puedeVerHistorialDeOtro(makeUser({ roles: [rol] }))).toBe(true);
      },
    );

    it('debe negar a AFILIADO', () => {
      expect(svc.puedeVerHistorialDeOtro(makeUser())).toBe(false);
    });
  });

  // ─── puedeVerCartasDeOtro ──────────────────────────────
  describe('puedeVerCartasDeOtro', () => {
    it('debe permitir a SECRETARIA', () => {
      expect(svc.puedeVerCartasDeOtro(makeUser({ roles: [RolNombre.SECRETARIA] }))).toBe(true);
    });

    it('debe permitir a FISCAL', () => {
      expect(svc.puedeVerCartasDeOtro(makeUser({ roles: [RolNombre.FISCAL] }))).toBe(true);
    });

    it('debe negar a ADMIN', () => {
      expect(svc.puedeVerCartasDeOtro(makeUser({ roles: [RolNombre.ADMIN] }))).toBe(false);
    });

    it('debe negar a TESORERA', () => {
      expect(svc.puedeVerCartasDeOtro(makeUser({ roles: [RolNombre.TESORERA] }))).toBe(false);
    });
  });

  // ─── puedeSolicitarCartaParaOtro ──────────────────────
  describe('puedeSolicitarCartaParaOtro', () => {
    it('debe permitir solo a SECRETARIA', () => {
      expect(svc.puedeSolicitarCartaParaOtro(makeUser({ roles: [RolNombre.SECRETARIA] }))).toBe(true);
    });

    it('debe negar a ADMIN', () => {
      expect(svc.puedeSolicitarCartaParaOtro(makeUser({ roles: [RolNombre.ADMIN] }))).toBe(false);
    });
  });

  // ─── puedeVerDocumentosDeOtro ─────────────────────────
  describe('puedeVerDocumentosDeOtro', () => {
    it.each([RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.FISCAL])(
      'debe permitir a %s',
      (rol) => {
        expect(svc.puedeVerDocumentosDeOtro(makeUser({ roles: [rol] }))).toBe(true);
      },
    );

    it('debe negar a AFILIADO', () => {
      expect(svc.puedeVerDocumentosDeOtro(makeUser())).toBe(false);
    });
  });

  // ─── puedeSubirDocumentoParaOtro ──────────────────────
  describe('puedeSubirDocumentoParaOtro', () => {
    it('debe permitir solo a TESORERA', () => {
      expect(svc.puedeSubirDocumentoParaOtro(makeUser({ roles: [RolNombre.TESORERA] }))).toBe(true);
    });

    it('debe negar a ADMIN', () => {
      expect(svc.puedeSubirDocumentoParaOtro(makeUser({ roles: [RolNombre.ADMIN] }))).toBe(false);
    });
  });

  // ─── puedeCrearPagoParaOtro ───────────────────────────
  describe('puedeCrearPagoParaOtro', () => {
    it('debe permitir solo a TESORERA', () => {
      expect(svc.puedeCrearPagoParaOtro(makeUser({ roles: [RolNombre.TESORERA] }))).toBe(true);
    });

    it('debe negar a SECRETARIA', () => {
      expect(svc.puedeCrearPagoParaOtro(makeUser({ roles: [RolNombre.SECRETARIA] }))).toBe(false);
    });
  });

  // ─── puedeListarCartasPendientes ──────────────────────
  describe('puedeListarCartasPendientes', () => {
    it('debe permitir a SECRETARIA', () => {
      expect(svc.puedeListarCartasPendientes(makeUser({ roles: [RolNombre.SECRETARIA] }))).toBe(true);
    });

    it('debe permitir a FISCAL', () => {
      expect(svc.puedeListarCartasPendientes(makeUser({ roles: [RolNombre.FISCAL] }))).toBe(true);
    });

    it('debe negar a ADMIN', () => {
      expect(svc.puedeListarCartasPendientes(makeUser({ roles: [RolNombre.ADMIN] }))).toBe(false);
    });
  });
});
