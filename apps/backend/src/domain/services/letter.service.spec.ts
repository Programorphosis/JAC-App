import { LetterService } from './letter.service';
import type {
  ILetterEmissionContext,
  CartaParaEmitir,
} from '../ports/letter-emission-context.port';

const CARTA_PENDIENTE: CartaParaEmitir = {
  id: 'carta-1',
  usuarioId: 'usr-1',
  juntaId: 'junta-1',
  estado: 'PENDIENTE',
  usuarioNombres: 'Juan',
  usuarioApellidos: 'Pérez',
  usuarioDocumento: '1234567890',
};

function createMockContext(
  overrides: Partial<ILetterEmissionContext> = {},
): jest.Mocked<ILetterEmissionContext> {
  return {
    getCarta: jest.fn().mockResolvedValue(CARTA_PENDIENTE),
    calculateDebt: jest.fn().mockResolvedValue({ total: 0, detalle: [] }),
    hasPagoCarta: jest.fn().mockResolvedValue(true),
    getRequisitosParaCarta: jest.fn().mockResolvedValue([]),
    getNextConsecutivoCarta: jest.fn().mockResolvedValue(7),
    updateCartaAprobada: jest.fn().mockResolvedValue(undefined),
    consumePagoCarta: jest.fn().mockResolvedValue(undefined),
    registerAudit: jest.fn().mockResolvedValue(undefined),
    generateCartaPdf: jest.fn().mockResolvedValue({
      rutaPdf: 's3://cartas/carta-1.pdf',
      hashDocumento: 'abc123',
    }),
    ...overrides,
  } as jest.Mocked<ILetterEmissionContext>;
}

describe('LetterService', () => {
  let service: LetterService;

  const PARAMS = {
    cartaId: 'carta-1',
    juntaId: 'junta-1',
    emitidaPorId: 'admin-1',
  };

  beforeEach(() => {
    service = new LetterService();
  });

  // ──────────────────────────────────────────────
  // Flujo exitoso completo
  // ──────────────────────────────────────────────
  it('emite carta correctamente cuando todas las precondiciones se cumplen', async () => {
    const ctx = createMockContext();

    const result = await service.emitLetter(PARAMS, ctx);

    expect(result.cartaId).toBe('carta-1');
    expect(result.consecutivo).toBe(7);
    expect(result.anio).toBe(new Date().getFullYear());
    expect(result.qrToken).toBeDefined();
    expect(result.rutaPdf).toBe('s3://cartas/carta-1.pdf');

    expect(ctx.updateCartaAprobada).toHaveBeenCalledWith(
      expect.objectContaining({
        cartaId: 'carta-1',
        juntaId: 'junta-1',
        consecutivo: 7,
        qrToken: expect.any(String),
      }),
    );
    expect(ctx.consumePagoCarta).toHaveBeenCalledWith('usr-1', 'junta-1');
    expect(ctx.registerAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entidad: 'Carta',
        entidadId: 'carta-1',
        accion: 'EMISION_CARTA',
      }),
    );
  });

  // ──────────────────────────────────────────────
  // Carta no encontrada
  // ──────────────────────────────────────────────
  it('lanza error si la carta no existe', async () => {
    const ctx = createMockContext({
      getCarta: jest.fn().mockResolvedValue(null),
    });

    await expect(service.emitLetter(PARAMS, ctx)).rejects.toThrow(
      'Carta no encontrada',
    );
  });

  // ──────────────────────────────────────────────
  // Carta no está en PENDIENTE
  // ──────────────────────────────────────────────
  it('lanza error si la carta no está en estado PENDIENTE', async () => {
    const ctx = createMockContext({
      getCarta: jest
        .fn()
        .mockResolvedValue({ ...CARTA_PENDIENTE, estado: 'APROBADA' }),
    });

    await expect(service.emitLetter(PARAMS, ctx)).rejects.toThrow(
      'no está en estado PENDIENTE',
    );
  });

  // ──────────────────────────────────────────────
  // Usuario con deuda pendiente
  // ──────────────────────────────────────────────
  it('lanza error si el usuario tiene deuda pendiente', async () => {
    const ctx = createMockContext({
      calculateDebt: jest
        .fn()
        .mockResolvedValue({ total: 50_000, detalle: [] }),
    });

    await expect(service.emitLetter(PARAMS, ctx)).rejects.toThrow(
      'Deuda pendiente',
    );
    expect(ctx.updateCartaAprobada).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────
  // Sin pago tipo CARTA
  // ──────────────────────────────────────────────
  it('lanza error si no hay pago tipo CARTA vigente', async () => {
    const ctx = createMockContext({
      hasPagoCarta: jest.fn().mockResolvedValue(false),
    });

    await expect(service.emitLetter(PARAMS, ctx)).rejects.toThrow(
      'pago tipo CARTA',
    );
  });

  // ──────────────────────────────────────────────
  // Requisito en MORA
  // ──────────────────────────────────────────────
  it('lanza error si un requisito obligatorio está en MORA', async () => {
    const ctx = createMockContext({
      getRequisitosParaCarta: jest.fn().mockResolvedValue([
        {
          requisitoTipoId: 'req-1',
          nombre: 'Agua',
          obligacionActiva: true,
          estado: 'MORA',
        },
      ]),
    });

    await expect(service.emitLetter(PARAMS, ctx)).rejects.toThrow(
      /Agua.*AL_DIA/,
    );
  });

  // ──────────────────────────────────────────────
  // Requisito no obligatorio en MORA: no bloquea
  // ──────────────────────────────────────────────
  it('permite emitir carta si el requisito en MORA no es obligatorio', async () => {
    const ctx = createMockContext({
      getRequisitosParaCarta: jest.fn().mockResolvedValue([
        {
          requisitoTipoId: 'req-1',
          nombre: 'Agua',
          obligacionActiva: false,
          estado: 'MORA',
        },
      ]),
    });

    const result = await service.emitLetter(PARAMS, ctx);
    expect(result.cartaId).toBe('carta-1');
  });

  // ──────────────────────────────────────────────
  // Sin generateCartaPdf: rutaPdf es null
  // ──────────────────────────────────────────────
  it('emite carta sin PDF si el contexto no tiene generateCartaPdf', async () => {
    const ctx = createMockContext();
    ctx.generateCartaPdf = undefined;

    const result = await service.emitLetter(PARAMS, ctx);

    expect(result.rutaPdf).toBeNull();
    expect(ctx.updateCartaAprobada).toHaveBeenCalledWith(
      expect.objectContaining({ rutaPdf: null }),
    );
  });

  // ──────────────────────────────────────────────
  // Sin datos de usuario para PDF: rutaPdf es null
  // ──────────────────────────────────────────────
  it('no genera PDF si faltan datos del usuario (nombres, apellidos, documento)', async () => {
    const ctx = createMockContext({
      getCarta: jest.fn().mockResolvedValue({
        ...CARTA_PENDIENTE,
        usuarioNombres: undefined,
        usuarioApellidos: undefined,
        usuarioDocumento: undefined,
      }),
    });

    const result = await service.emitLetter(PARAMS, ctx);

    expect(result.rutaPdf).toBeNull();
    expect(ctx.generateCartaPdf).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────
  // Genera qrToken único (UUID)
  // ──────────────────────────────────────────────
  it('genera un qrToken UUID único para cada emisión', async () => {
    const ctx = createMockContext();

    const result1 = await service.emitLetter(PARAMS, ctx);
    const result2 = await service.emitLetter(PARAMS, ctx);

    expect(result1.qrToken).toMatch(/^[0-9a-f]{8}-/);
    expect(result1.qrToken).not.toBe(result2.qrToken);
  });
});
