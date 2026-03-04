import { PaymentService } from './payment.service';
import type { IPaymentRegistrationContext } from '../ports/payment-registration-context.port';
import { DeudaCeroError, PagoDuplicadoError } from '../errors/domain.errors';

function createMockContext(
  overrides: Partial<IPaymentRegistrationContext> = {},
): jest.Mocked<IPaymentRegistrationContext> {
  return {
    calculateDebt: jest.fn().mockResolvedValue({ total: 100_000, detalle: [] }),
    createJuntaPayment: jest.fn().mockResolvedValue({ pagoId: 'pago-1' }),
    registerAudit: jest.fn().mockResolvedValue(undefined),
    findPagoByReferenciaExterna: jest.fn().mockResolvedValue(null),
    getNextConsecutivoPagoJunta: jest.fn().mockResolvedValue(42),
    ...overrides,
  } as jest.Mocked<IPaymentRegistrationContext>;
}

describe('PaymentService', () => {
  let service: PaymentService;

  const USR = 'usr-1';
  const JUNTA = 'junta-1';
  const ADMIN = 'admin-1';

  beforeEach(() => {
    service = new PaymentService();
  });

  // ──────────────────────────────────────────────
  // Flujo exitoso: pago efectivo
  // ──────────────────────────────────────────────
  it('registra un pago JUNTA correctamente con el monto de la deuda calculada', async () => {
    const ctx = createMockContext();

    const result = await service.registerJuntaPayment(
      { usuarioId: USR, juntaId: JUNTA, metodo: 'EFECTIVO', registradoPorId: ADMIN },
      ctx,
    );

    expect(result.pagoId).toBe('pago-1');
    expect(result.monto).toBe(100_000);
    expect(result.consecutivo).toBe(42);

    expect(ctx.calculateDebt).toHaveBeenCalledWith(USR, JUNTA);
    expect(ctx.getNextConsecutivoPagoJunta).toHaveBeenCalledWith(JUNTA);
    expect(ctx.createJuntaPayment).toHaveBeenCalledWith({
      usuarioId: USR,
      juntaId: JUNTA,
      monto: 100_000,
      metodo: 'EFECTIVO',
      registradoPorId: ADMIN,
      referenciaExterna: undefined,
      consecutivo: 42,
    });
    expect(ctx.registerAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        juntaId: JUNTA,
        entidad: 'Pago',
        entidadId: 'pago-1',
        accion: 'REGISTRO_PAGO_JUNTA',
      }),
    );
  });

  // ──────────────────────────────────────────────
  // Pago online con referencia externa
  // ──────────────────────────────────────────────
  it('registra pago ONLINE con referencia externa', async () => {
    const ctx = createMockContext();

    const result = await service.registerJuntaPayment(
      {
        usuarioId: USR,
        juntaId: JUNTA,
        metodo: 'ONLINE',
        registradoPorId: ADMIN,
        referenciaExterna: 'wompi-tx-123',
      },
      ctx,
    );

    expect(result.pagoId).toBe('pago-1');
    expect(ctx.findPagoByReferenciaExterna).toHaveBeenCalledWith('wompi-tx-123');
    expect(ctx.createJuntaPayment).toHaveBeenCalledWith(
      expect.objectContaining({ referenciaExterna: 'wompi-tx-123' }),
    );
  });

  // ──────────────────────────────────────────────
  // Idempotencia: pago duplicado
  // ──────────────────────────────────────────────
  it('lanza PagoDuplicadoError si ya existe un pago con esa referencia externa', async () => {
    const ctx = createMockContext({
      findPagoByReferenciaExterna: jest.fn().mockResolvedValue({ id: 'pago-existente' }),
    });

    await expect(
      service.registerJuntaPayment(
        {
          usuarioId: USR,
          juntaId: JUNTA,
          metodo: 'ONLINE',
          registradoPorId: ADMIN,
          referenciaExterna: 'wompi-tx-123',
        },
        ctx,
      ),
    ).rejects.toThrow('ya registrado');

    expect(ctx.calculateDebt).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────
  // Sin deuda: no se puede pagar
  // ──────────────────────────────────────────────
  it('lanza DeudaCeroError si el usuario no tiene deuda', async () => {
    const ctx = createMockContext({
      calculateDebt: jest.fn().mockResolvedValue({ total: 0, detalle: [] }),
    });

    await expect(
      service.registerJuntaPayment(
        { usuarioId: USR, juntaId: JUNTA, metodo: 'EFECTIVO', registradoPorId: ADMIN },
        ctx,
      ),
    ).rejects.toThrow('al día');

    expect(ctx.createJuntaPayment).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────
  // Sin referencia: no verifica duplicados
  // ──────────────────────────────────────────────
  it('no verifica duplicados cuando no hay referencia externa (pago efectivo)', async () => {
    const ctx = createMockContext();

    await service.registerJuntaPayment(
      { usuarioId: USR, juntaId: JUNTA, metodo: 'EFECTIVO', registradoPorId: ADMIN },
      ctx,
    );

    expect(ctx.findPagoByReferenciaExterna).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────
  // Auditoría contiene metadata completa
  // ──────────────────────────────────────────────
  it('registra auditoría con metadata completa del pago', async () => {
    const ctx = createMockContext();

    await service.registerJuntaPayment(
      {
        usuarioId: USR,
        juntaId: JUNTA,
        metodo: 'TRANSFERENCIA',
        registradoPorId: ADMIN,
        referenciaExterna: 'transfer-001',
      },
      ctx,
    );

    expect(ctx.registerAudit).toHaveBeenCalledWith({
      juntaId: JUNTA,
      entidad: 'Pago',
      entidadId: 'pago-1',
      accion: 'REGISTRO_PAGO_JUNTA',
      metadata: {
        usuarioId: USR,
        monto: 100_000,
        metodo: 'TRANSFERENCIA',
        consecutivo: 42,
        referenciaExterna: 'transfer-001',
      },
      ejecutadoPorId: ADMIN,
    });
  });
});
