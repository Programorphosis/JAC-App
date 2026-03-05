import { TipoIntencionPago } from '@prisma/client';
import { PagosService } from './pagos.service';
import {
  DeudaCeroError,
  PagoDuplicadoError,
  UsuarioNoEncontradoError,
  UsuarioInactivoError,
  IntencionPagoNoEncontradaError,
  WompiNoConfiguradoError,
  PagoCartaPendienteError,
  MontoCartaNoConfiguradoError,
  CartaVigenteError,
} from '../../domain/errors';

jest.mock('../../domain/helpers/carta-pago-validation.helper', () => ({
  validateCartaPagoPreconditions: jest.fn(),
}));

import { validateCartaPagoPreconditions } from '../../domain/helpers/carta-pago-validation.helper';

const mockValidateCartaPago = validateCartaPagoPreconditions as jest.Mock;

function createMocks() {
  const prisma: Record<string, any> = {
    usuario: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    junta: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    pago: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    intencionPago: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    carta: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  };

  const paymentRunner = {
    registerJuntaPayment: jest.fn(),
    registerCartaPayment: jest.fn(),
  };

  const debtService = {
    calculateUserDebt: jest.fn(),
  };

  const wompi = {
    crearPaymentLink: jest.fn(),
    obtenerTransaccion: jest.fn(),
  };

  const encryption = {
    decrypt: jest.fn(),
  };

  const service = new PagosService(
    paymentRunner as any,
    debtService as any,
    prisma as any,
    wompi as any,
    encryption as any,
  );

  return { service, prisma, paymentRunner, debtService, wompi, encryption };
}

const JUNTA_ID = 'junta-1';
const USUARIO_ID = 'user-1';
const REGISTRADO_POR_ID = 'admin-1';

describe('PagosService', () => {
  let service: PagosService;
  let prisma: ReturnType<typeof createMocks>['prisma'];
  let paymentRunner: ReturnType<typeof createMocks>['paymentRunner'];
  let debtService: ReturnType<typeof createMocks>['debtService'];
  let wompi: ReturnType<typeof createMocks>['wompi'];
  let encryption: ReturnType<typeof createMocks>['encryption'];

  beforeEach(() => {
    jest.clearAllMocks();
    ({ service, prisma, paymentRunner, debtService, wompi, encryption } = createMocks());
    process.env.WOMPI_REDIRECT_URL = 'https://app.test/pagos/retorno';
  });

  afterEach(() => {
    delete process.env.WOMPI_REDIRECT_URL;
  });

  // ─── registrarPagoEfectivo ────────────────────────────────────

  describe('registrarPagoEfectivo', () => {
    const params = {
      usuarioId: USUARIO_ID,
      juntaId: JUNTA_ID,
      metodo: 'EFECTIVO' as const,
      registradoPorId: REGISTRADO_POR_ID,
    };

    it('debe validar usuario activo y delegar a paymentRunner', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ activo: true });
      paymentRunner.registerJuntaPayment.mockResolvedValue({
        pagoId: 'p1',
        monto: 50000,
        consecutivo: 1,
      });

      const result = await service.registrarPagoEfectivo(params);

      expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
        where: { id: USUARIO_ID, juntaId: JUNTA_ID },
        select: { activo: true },
      });
      expect(paymentRunner.registerJuntaPayment).toHaveBeenCalledWith({
        usuarioId: USUARIO_ID,
        juntaId: JUNTA_ID,
        metodo: 'EFECTIVO',
        registradoPorId: REGISTRADO_POR_ID,
        referenciaExterna: undefined,
      });
      expect(result).toEqual({ pagoId: 'p1', monto: 50000, consecutivo: 1 });
    });

    it('debe lanzar UsuarioNoEncontradoError si el usuario no existe', async () => {
      prisma.usuario.findFirst.mockResolvedValue(null);

      await expect(service.registrarPagoEfectivo(params)).rejects.toThrow(
        UsuarioNoEncontradoError,
      );
      expect(paymentRunner.registerJuntaPayment).not.toHaveBeenCalled();
    });

    it('debe lanzar UsuarioInactivoError si el usuario está inactivo', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ activo: false });

      await expect(service.registrarPagoEfectivo(params)).rejects.toThrow(
        UsuarioInactivoError,
      );
      expect(paymentRunner.registerJuntaPayment).not.toHaveBeenCalled();
    });
  });

  // ─── registrarPagoCarta ───────────────────────────────────────

  describe('registrarPagoCarta', () => {
    const params = {
      usuarioId: USUARIO_ID,
      juntaId: JUNTA_ID,
      metodo: 'EFECTIVO' as const,
      registradoPorId: REGISTRADO_POR_ID,
    };

    it('debe validar usuario activo y delegar a paymentRunner.registerCartaPayment', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ activo: true });
      paymentRunner.registerCartaPayment.mockResolvedValue({
        pagoId: 'pc1',
        monto: 15000,
        consecutivo: 1,
      });

      const result = await service.registrarPagoCarta(params);

      expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
        where: { id: USUARIO_ID, juntaId: JUNTA_ID },
        select: { activo: true },
      });
      expect(paymentRunner.registerCartaPayment).toHaveBeenCalledWith(params);
      expect(result).toEqual({ pagoId: 'pc1', monto: 15000, consecutivo: 1 });
    });

    it('debe lanzar UsuarioNoEncontradoError si el usuario no existe', async () => {
      prisma.usuario.findFirst.mockResolvedValue(null);

      await expect(service.registrarPagoCarta(params)).rejects.toThrow(
        UsuarioNoEncontradoError,
      );
    });

    it('debe lanzar UsuarioInactivoError si el usuario está inactivo', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ activo: false });

      await expect(service.registrarPagoCarta(params)).rejects.toThrow(
        UsuarioInactivoError,
      );
    });
  });

  // ─── crearIntencionPagoOnline ─────────────────────────────────

  describe('crearIntencionPagoOnline', () => {
    const params = {
      usuarioId: USUARIO_ID,
      juntaId: JUNTA_ID,
      iniciadoPorId: REGISTRADO_POR_ID,
    };

    function setupHappyPath(opts?: { publicKey?: string }) {
      prisma.usuario.findFirst.mockResolvedValue({ activo: true });
      debtService.calculateUserDebt.mockResolvedValue({ total: 50000 });
      prisma.junta.findUnique.mockResolvedValue({
        wompiPrivateKey: 'enc-private',
        wompiPublicKey: opts?.publicKey !== undefined ? 'enc-public' : null,
        wompiEnvironment: 'sandbox',
      });
      encryption.decrypt.mockImplementation((val: string) => {
        if (val === 'enc-private') return 'prv_test_abc123';
        if (val === 'enc-public') return opts?.publicKey ?? '';
        return val;
      });
      wompi.crearPaymentLink.mockResolvedValue({ id: 'link-123' });
      prisma.intencionPago.create.mockResolvedValue({ id: 'ip-1' });
    }

    it('debe validar usuario, calcular deuda, obtener credenciales, crear link y guardar intención', async () => {
      setupHappyPath({ publicKey: 'pub_test_xyz789' });

      const result = await service.crearIntencionPagoOnline(params);

      expect(debtService.calculateUserDebt).toHaveBeenCalledWith({
        usuarioId: USUARIO_ID,
        juntaId: JUNTA_ID,
      });
      expect(wompi.crearPaymentLink).toHaveBeenCalledWith(
        expect.objectContaining({
          amountInCents: 5000000,
          currency: 'COP',
          singleUse: true,
        }),
        expect.objectContaining({
          privateKey: 'prv_test_abc123',
          environment: 'sandbox',
        }),
      );
      expect(prisma.intencionPago.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          usuarioId: USUARIO_ID,
          juntaId: JUNTA_ID,
          tipoPago: TipoIntencionPago.JUNTA,
          montoCents: 5000000,
          wompiLinkId: 'link-123',
        }),
      });
      expect(result.monto).toBe(50000);
      expect(result.montoCents).toBe(5000000);
      expect(result.checkoutUrl).toContain('link-123');
    });

    it('debe lanzar DeudaCeroError si la deuda es 0', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ activo: true });
      debtService.calculateUserDebt.mockResolvedValue({ total: 0 });

      await expect(service.crearIntencionPagoOnline(params)).rejects.toThrow(
        DeudaCeroError,
      );
      expect(wompi.crearPaymentLink).not.toHaveBeenCalled();
    });

    it('debe lanzar WompiNoConfiguradoError si la junta no tiene llaves Wompi', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ activo: true });
      debtService.calculateUserDebt.mockResolvedValue({ total: 50000 });
      prisma.junta.findUnique.mockResolvedValue({
        wompiPrivateKey: null,
        wompiPublicKey: null,
        wompiEnvironment: null,
      });

      await expect(service.crearIntencionPagoOnline(params)).rejects.toThrow(
        WompiNoConfiguradoError,
      );
    });

    it('debe lanzar UsuarioInactivoError si el usuario está inactivo', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ activo: false });

      await expect(service.crearIntencionPagoOnline(params)).rejects.toThrow(
        UsuarioInactivoError,
      );
    });

    it('debe incluir publicKey en la checkout URL cuando está disponible', async () => {
      setupHappyPath({ publicKey: 'pub_test_xyz789' });

      const result = await service.crearIntencionPagoOnline(params);

      expect(result.checkoutUrl).toContain('?public-key=');
      expect(result.checkoutUrl).toContain('pub_test_xyz789');
    });

    it('no debe incluir publicKey cuando no está disponible', async () => {
      setupHappyPath();

      const result = await service.crearIntencionPagoOnline(params);

      expect(result.checkoutUrl).toBe('https://checkout.wompi.co/l/link-123');
      expect(result.checkoutUrl).not.toContain('public-key');
    });
  });

  // ─── crearIntencionPagoCartaOnline ────────────────────────────

  describe('crearIntencionPagoCartaOnline', () => {
    const params = {
      usuarioId: USUARIO_ID,
      juntaId: JUNTA_ID,
      iniciadoPorId: REGISTRADO_POR_ID,
    };

    function setupCartaHappyPath() {
      prisma.usuario.findFirst.mockResolvedValue({ activo: true, id: USUARIO_ID });
      prisma.junta.findUnique.mockResolvedValue({
        montoCarta: 15000,
        wompiPrivateKey: 'enc-private',
        wompiPublicKey: null,
        wompiEnvironment: 'sandbox',
      });
      prisma.carta.findFirst.mockResolvedValue(null);
      prisma.pago.findFirst.mockResolvedValue(null);
      mockValidateCartaPago.mockImplementation(() => undefined);
      encryption.decrypt.mockReturnValue('prv_test_abc123');
      wompi.crearPaymentLink.mockResolvedValue({ id: 'carta-link-1' });
      prisma.intencionPago.create.mockResolvedValue({ id: 'ip-c1' });
    }

    it('debe validar usuario, verificar precondiciones de carta y crear link de pago', async () => {
      setupCartaHappyPath();

      const result = await service.crearIntencionPagoCartaOnline(params);

      expect(mockValidateCartaPago).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: USUARIO_ID,
          juntaId: JUNTA_ID,
        }),
      );
      expect(wompi.crearPaymentLink).toHaveBeenCalledWith(
        expect.objectContaining({
          amountInCents: 1500000,
          currency: 'COP',
          singleUse: true,
        }),
        expect.objectContaining({ privateKey: 'prv_test_abc123' }),
      );
      expect(prisma.intencionPago.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipoPago: TipoIntencionPago.CARTA,
          montoCents: 1500000,
          wompiLinkId: 'carta-link-1',
        }),
      });
      expect(result.monto).toBe(15000);
      expect(result.montoCents).toBe(1500000);
      expect(result.checkoutUrl).toContain('carta-link-1');
    });

    it('debe lanzar UsuarioInactivoError si el usuario está inactivo', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ activo: false });

      await expect(service.crearIntencionPagoCartaOnline(params)).rejects.toThrow(
        UsuarioInactivoError,
      );
    });

    it('debe propagar PagoCartaPendienteError si validateCartaPagoPreconditions la lanza', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ activo: true, id: USUARIO_ID });
      prisma.junta.findUnique.mockResolvedValue({ montoCarta: 15000 });
      prisma.carta.findFirst.mockResolvedValue(null);
      prisma.pago.findFirst.mockResolvedValue(null);
      mockValidateCartaPago.mockImplementation(() => {
        throw new PagoCartaPendienteError(USUARIO_ID);
      });

      await expect(service.crearIntencionPagoCartaOnline(params)).rejects.toThrow(
        PagoCartaPendienteError,
      );
    });

    it('debe propagar MontoCartaNoConfiguradoError si la junta no tiene montoCarta', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ activo: true, id: USUARIO_ID });
      prisma.junta.findUnique.mockResolvedValue({ montoCarta: null });
      prisma.carta.findFirst.mockResolvedValue(null);
      prisma.pago.findFirst.mockResolvedValue(null);
      mockValidateCartaPago.mockImplementation(() => {
        throw new MontoCartaNoConfiguradoError(JUNTA_ID);
      });

      await expect(service.crearIntencionPagoCartaOnline(params)).rejects.toThrow(
        MontoCartaNoConfiguradoError,
      );
    });

    it('debe propagar CartaVigenteError si el usuario tiene carta vigente', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ activo: true, id: USUARIO_ID });
      prisma.junta.findUnique.mockResolvedValue({ montoCarta: 15000 });
      prisma.carta.findFirst.mockResolvedValue(null);
      prisma.pago.findFirst.mockResolvedValue(null);
      mockValidateCartaPago.mockImplementation(() => {
        throw new CartaVigenteError(USUARIO_ID);
      });

      await expect(service.crearIntencionPagoCartaOnline(params)).rejects.toThrow(
        CartaVigenteError,
      );
    });
  });

  // ─── registrarPagoDesdeProveedor ──────────────────────────────

  describe('registrarPagoDesdeProveedor', () => {
    const intencionBase = {
      usuarioId: USUARIO_ID,
      juntaId: JUNTA_ID,
      tipoPago: 'JUNTA' as const,
      montoCents: 5000000,
      iniciadoPorId: REGISTRADO_POR_ID,
    };

    it('debe encontrar intención por paymentLinkId y registrar pago JUNTA', async () => {
      prisma.intencionPago.findUnique.mockResolvedValue(intencionBase);
      prisma.usuario.findFirst.mockResolvedValue({ activo: true });
      paymentRunner.registerJuntaPayment.mockResolvedValue({
        pagoId: 'p1',
        monto: 50000,
        consecutivo: 1,
      });

      const result = await service.registrarPagoDesdeProveedor({
        transactionId: 'tx-100',
        amountInCents: 5000000,
        paymentLinkId: 'link-123',
      });

      expect(prisma.intencionPago.findUnique).toHaveBeenCalledWith({
        where: { wompiLinkId: 'link-123' },
        select: expect.objectContaining({ usuarioId: true, tipoPago: true }),
      });
      expect(paymentRunner.registerJuntaPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          metodo: 'ONLINE',
          referenciaExterna: 'tx-100',
        }),
      );
      expect(result.pagoId).toBe('p1');
    });

    it('debe encontrar intención por reference cuando no hay paymentLinkId', async () => {
      prisma.intencionPago.findFirst.mockResolvedValue(intencionBase);
      prisma.usuario.findFirst.mockResolvedValue({ activo: true });
      paymentRunner.registerJuntaPayment.mockResolvedValue({
        pagoId: 'p2',
        monto: 50000,
        consecutivo: 2,
      });

      await service.registrarPagoDesdeProveedor({
        transactionId: 'tx-200',
        amountInCents: 5000000,
        reference: 'JAC-ref-001',
      });

      expect(prisma.intencionPago.findFirst).toHaveBeenCalledWith({
        where: { referencia: 'JAC-ref-001' },
        select: expect.objectContaining({ usuarioId: true }),
      });
    });

    it('debe lanzar IntencionPagoNoEncontradaError cuando no se encuentra intención', async () => {
      prisma.intencionPago.findUnique.mockResolvedValue(null);

      await expect(
        service.registrarPagoDesdeProveedor({
          transactionId: 'tx-404',
          amountInCents: 5000000,
          paymentLinkId: 'link-ghost',
        }),
      ).rejects.toThrow(IntencionPagoNoEncontradaError);
    });

    it('debe lanzar IntencionPagoNoEncontradaError cuando el monto no coincide', async () => {
      prisma.intencionPago.findUnique.mockResolvedValue({
        ...intencionBase,
        montoCents: 3000000,
      });

      await expect(
        service.registrarPagoDesdeProveedor({
          transactionId: 'tx-mismatch',
          amountInCents: 5000000,
          paymentLinkId: 'link-123',
        }),
      ).rejects.toThrow(IntencionPagoNoEncontradaError);
    });

    it('debe delegar a registerCartaPayment para tipo CARTA', async () => {
      const intencionCarta = { ...intencionBase, tipoPago: 'CARTA' as const };
      prisma.intencionPago.findUnique.mockResolvedValue(intencionCarta);
      prisma.usuario.findFirst.mockResolvedValue({ activo: true });
      paymentRunner.registerCartaPayment.mockResolvedValue({
        pagoId: 'pc1',
        monto: 15000,
        consecutivo: 1,
      });

      const result = await service.registrarPagoDesdeProveedor({
        transactionId: 'tx-carta',
        amountInCents: 5000000,
        paymentLinkId: 'link-carta',
      });

      expect(paymentRunner.registerCartaPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          metodo: 'ONLINE',
          referenciaExterna: 'tx-carta',
        }),
      );
      expect(paymentRunner.registerJuntaPayment).not.toHaveBeenCalled();
      expect(result.pagoId).toBe('pc1');
    });

    it('debe validar que el usuario esté activo', async () => {
      prisma.intencionPago.findUnique.mockResolvedValue(intencionBase);
      prisma.usuario.findFirst.mockResolvedValue({ activo: false });

      await expect(
        service.registrarPagoDesdeProveedor({
          transactionId: 'tx-inactive',
          amountInCents: 5000000,
          paymentLinkId: 'link-123',
        }),
      ).rejects.toThrow(UsuarioInactivoError);
    });
  });

  // ─── consultarYRegistrarSiAprobado ────────────────────────────

  describe('consultarYRegistrarSiAprobado', () => {
    function setupWompiCredentials() {
      prisma.junta.findUnique.mockResolvedValue({
        wompiPrivateKey: 'enc-private',
        wompiPublicKey: null,
        wompiEnvironment: 'sandbox',
      });
      encryption.decrypt.mockReturnValue('prv_test_abc123');
    }

    it('debe registrar pago cuando la transacción está APPROVED', async () => {
      setupWompiCredentials();
      wompi.obtenerTransaccion.mockResolvedValue({
        id: 'tx-approved',
        status: 'APPROVED',
        amount_in_cents: 5000000,
        payment_link_id: 'link-123',
        reference: 'JAC-ref',
      });
      prisma.intencionPago.findUnique.mockResolvedValue({
        usuarioId: USUARIO_ID,
        juntaId: JUNTA_ID,
        tipoPago: 'JUNTA',
        montoCents: 5000000,
        iniciadoPorId: REGISTRADO_POR_ID,
      });
      prisma.usuario.findFirst.mockResolvedValue({ activo: true });
      paymentRunner.registerJuntaPayment.mockResolvedValue({
        pagoId: 'p-ok',
        monto: 50000,
        consecutivo: 5,
      });

      const result = await service.consultarYRegistrarSiAprobado('tx-approved', JUNTA_ID);

      expect(result.registrado).toBe(true);
      expect(result.codigo).toBe('REGISTRADO_AHORA');
      expect(result.pagoId).toBe('p-ok');
      expect(result.monto).toBe(50000);
      expect(result.consecutivo).toBe(5);
    });

    it('debe retornar YA_REGISTRADO cuando ocurre PagoDuplicadoError', async () => {
      setupWompiCredentials();
      wompi.obtenerTransaccion.mockResolvedValue({
        id: 'tx-dup',
        status: 'APPROVED',
        amount_in_cents: 5000000,
        payment_link_id: 'link-dup',
      });
      prisma.intencionPago.findUnique.mockResolvedValue({
        usuarioId: USUARIO_ID,
        juntaId: JUNTA_ID,
        tipoPago: 'JUNTA',
        montoCents: 5000000,
        iniciadoPorId: REGISTRADO_POR_ID,
      });
      prisma.usuario.findFirst.mockResolvedValue({ activo: true });
      paymentRunner.registerJuntaPayment.mockRejectedValue(
        new PagoDuplicadoError('tx-dup'),
      );

      const result = await service.consultarYRegistrarSiAprobado('tx-dup', JUNTA_ID);

      expect(result.registrado).toBe(true);
      expect(result.codigo).toBe('YA_REGISTRADO');
    });

    it('debe retornar TRANSACCION_NO_ENCONTRADA cuando la tx no existe', async () => {
      setupWompiCredentials();
      wompi.obtenerTransaccion.mockResolvedValue(null);

      const result = await service.consultarYRegistrarSiAprobado('tx-ghost', JUNTA_ID);

      expect(result.registrado).toBe(false);
      expect(result.codigo).toBe('TRANSACCION_NO_ENCONTRADA');
    });

    it('debe retornar TRANSACCION_PENDIENTE para estado PENDING', async () => {
      setupWompiCredentials();
      wompi.obtenerTransaccion.mockResolvedValue({
        id: 'tx-pending',
        status: 'PENDING',
        amount_in_cents: 5000000,
      });

      const result = await service.consultarYRegistrarSiAprobado('tx-pending', JUNTA_ID);

      expect(result.registrado).toBe(false);
      expect(result.codigo).toBe('TRANSACCION_PENDIENTE');
      expect(result.status).toBe('PENDING');
    });

    it('debe retornar TRANSACCION_RECHAZADA para estado DECLINED', async () => {
      setupWompiCredentials();
      wompi.obtenerTransaccion.mockResolvedValue({
        id: 'tx-declined',
        status: 'DECLINED',
        amount_in_cents: 5000000,
      });

      const result = await service.consultarYRegistrarSiAprobado('tx-declined', JUNTA_ID);

      expect(result.registrado).toBe(false);
      expect(result.codigo).toBe('TRANSACCION_RECHAZADA');
      expect(result.status).toBe('DECLINED');
    });

    it('debe retornar INTENCION_NO_ENCONTRADA cuando ocurre IntencionPagoNoEncontradaError', async () => {
      setupWompiCredentials();
      wompi.obtenerTransaccion.mockResolvedValue({
        id: 'tx-no-intencion',
        status: 'APPROVED',
        amount_in_cents: 9999999,
        payment_link_id: 'link-invalid',
      });
      prisma.intencionPago.findUnique.mockResolvedValue(null);

      const result = await service.consultarYRegistrarSiAprobado('tx-no-intencion', JUNTA_ID);

      expect(result.registrado).toBe(false);
      expect(result.codigo).toBe('INTENCION_NO_ENCONTRADA');
    });

    it('debe retornar USUARIO_INACTIVO cuando ocurre UsuarioInactivoError', async () => {
      setupWompiCredentials();
      wompi.obtenerTransaccion.mockResolvedValue({
        id: 'tx-inactivo',
        status: 'APPROVED',
        amount_in_cents: 5000000,
        payment_link_id: 'link-ok',
      });
      prisma.intencionPago.findUnique.mockResolvedValue({
        usuarioId: USUARIO_ID,
        juntaId: JUNTA_ID,
        tipoPago: 'JUNTA',
        montoCents: 5000000,
        iniciadoPorId: REGISTRADO_POR_ID,
      });
      prisma.usuario.findFirst.mockResolvedValue({ activo: false });

      const result = await service.consultarYRegistrarSiAprobado('tx-inactivo', JUNTA_ID);

      expect(result.registrado).toBe(false);
      expect(result.codigo).toBe('USUARIO_INACTIVO');
    });
  });

  // ─── listar ───────────────────────────────────────────────────

  describe('listar', () => {
    it('debe consultar pagos con filtro juntaId', async () => {
      prisma.pago.findMany.mockResolvedValue([]);
      prisma.pago.count.mockResolvedValue(0);

      const result = await service.listar(JUNTA_ID);

      expect(prisma.pago.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { juntaId: JUNTA_ID },
          skip: 0,
          take: 20,
        }),
      );
      expect(prisma.pago.count).toHaveBeenCalledWith({
        where: { juntaId: JUNTA_ID },
      });
      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({ total: 0, page: 1, limit: 20 });
    });

    it('debe aplicar filtros de búsqueda, fecha y tipo', async () => {
      const fechaDesde = new Date('2025-01-01');
      const fechaHasta = new Date('2025-12-31');
      prisma.pago.findMany.mockResolvedValue([]);
      prisma.pago.count.mockResolvedValue(0);

      await service.listar(JUNTA_ID, 2, 10, {
        tipo: 'JUNTA' as any,
        fechaDesde,
        fechaHasta,
        search: 'Juan',
      });

      const callArgs = prisma.pago.findMany.mock.calls[0][0];
      expect(callArgs.where.juntaId).toBe(JUNTA_ID);
      expect(callArgs.where.tipo).toBe('JUNTA');
      expect(callArgs.where.fechaPago).toEqual({ gte: fechaDesde, lte: fechaHasta });
      expect(callArgs.where.OR).toBeDefined();
      expect(callArgs.where.OR.length).toBeGreaterThan(0);
      expect(callArgs.skip).toBe(10);
      expect(callArgs.take).toBe(10);
    });

    it('debe mapear los datos de pagos en la respuesta', async () => {
      const pago = {
        id: 'p1',
        tipo: 'JUNTA',
        metodo: 'EFECTIVO',
        monto: 50000,
        consecutivo: 1,
        referenciaExterna: null,
        fechaPago: new Date('2025-06-15'),
        vigencia: null,
        usuario: {
          id: USUARIO_ID,
          nombres: 'Juan',
          apellidos: 'Pérez',
          numeroDocumento: '123456',
        },
        registradoPor: {
          id: REGISTRADO_POR_ID,
          nombres: 'Admin',
          apellidos: 'Sistema',
        },
      };
      prisma.pago.findMany.mockResolvedValue([pago]);
      prisma.pago.count.mockResolvedValue(1);

      const result = await service.listar(JUNTA_ID);

      expect(result.data[0].usuarioNombre).toBe('Juan Pérez (123456)');
      expect(result.data[0].registradoPorNombre).toBe('Admin Sistema');
      expect(result.data[0].monto).toBe(50000);
    });
  });

  // ─── getEstadisticas ──────────────────────────────────────────

  describe('getEstadisticas', () => {
    it('debe agregar totales por método, tipo, mes y año', async () => {
      const pagos = [
        {
          monto: 50000,
          fechaPago: new Date('2025-03-15'),
          tipo: 'JUNTA',
          metodo: 'EFECTIVO',
          usuarioId: 'u1',
          registradoPorId: 'admin-1',
        },
        {
          monto: 30000,
          fechaPago: new Date('2025-03-20'),
          tipo: 'JUNTA',
          metodo: 'TRANSFERENCIA',
          usuarioId: 'u2',
          registradoPorId: 'admin-1',
        },
        {
          monto: 50000,
          fechaPago: new Date('2025-04-10'),
          tipo: 'JUNTA',
          metodo: 'ONLINE',
          usuarioId: 'u3',
          registradoPorId: 'u3',
        },
        {
          monto: 15000,
          fechaPago: new Date('2025-04-12'),
          tipo: 'CARTA',
          metodo: 'EFECTIVO',
          usuarioId: 'u1',
          registradoPorId: 'admin-1',
        },
        {
          monto: 50000,
          fechaPago: new Date('2024-12-01'),
          tipo: 'JUNTA',
          metodo: 'ONLINE',
          usuarioId: 'u4',
          registradoPorId: 'admin-1',
        },
      ];
      prisma.pago.findMany.mockResolvedValue(pagos);

      const result = await service.getEstadisticas(JUNTA_ID);

      expect(result.total).toBe(195000);
      expect(result.porMetodo.efectivo).toBe(65000);
      expect(result.porMetodo.transferencia).toBe(30000);
      expect(result.porMetodo.online).toBe(100000);
      expect(result.porMetodo.onlineUsuarios).toBe(50000);
      expect(result.porMetodo.onlineTesorera).toBe(50000);
      expect(result.porTipo.tarifa).toBe(180000);
      expect(result.porTipo.carta).toBe(15000);
      expect(result.porAnio).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ anio: 2025, total: 145000 }),
          expect.objectContaining({ anio: 2024, total: 50000 }),
        ]),
      );
      expect(result.porMes.length).toBeGreaterThanOrEqual(3);
    });

    it('debe filtrar porMes por año cuando se proporciona parámetro anio', async () => {
      const pagos = [
        {
          monto: 50000,
          fechaPago: new Date('2025-06-15'),
          tipo: 'JUNTA',
          metodo: 'EFECTIVO',
          usuarioId: 'u1',
          registradoPorId: 'admin-1',
        },
        {
          monto: 30000,
          fechaPago: new Date('2024-06-15'),
          tipo: 'JUNTA',
          metodo: 'EFECTIVO',
          usuarioId: 'u2',
          registradoPorId: 'admin-1',
        },
      ];
      prisma.pago.findMany.mockResolvedValue(pagos);

      const result = await service.getEstadisticas(JUNTA_ID, 2025);

      expect(result.porMes).toEqual([
        expect.objectContaining({ anio: 2025, mes: 6, total: 50000 }),
      ]);
      expect(result.total).toBe(80000);
    });

    it('debe retornar vacío si no hay pagos', async () => {
      prisma.pago.findMany.mockResolvedValue([]);

      const result = await service.getEstadisticas(JUNTA_ID);

      expect(result.total).toBe(0);
      expect(result.porMetodo.efectivo).toBe(0);
      expect(result.porTipo.carta).toBe(0);
      expect(result.porAnio).toEqual([]);
      expect(result.porMes).toEqual([]);
    });
  });
});
