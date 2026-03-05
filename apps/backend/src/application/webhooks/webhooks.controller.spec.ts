import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { WebhooksController } from './webhooks.controller';

function buildChecksumFor(
  txId: string,
  txStatus: string,
  amountInCents: number,
  timestamp: number,
  secret: string,
): string {
  const concat = `${txId}${txStatus}${amountInCents}${timestamp}${secret}`;
  return createHash('sha256').update(concat).digest('hex').toUpperCase();
}

function makeBody(overrides: Record<string, unknown> = {}) {
  const base = {
    event: 'transaction.updated',
    data: {
      transaction: {
        id: 'tx-001',
        status: 'APPROVED',
        amount_in_cents: 100000,
        currency: 'COP',
        reference: 'ref-1',
        payment_link_id: 'link-1',
      },
    },
    sent_at: '2025-01-15T10:00:00Z',
    timestamp: 1736935200,
    signature: {
      properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
      checksum: '',
    },
  };
  return { ...base, ...overrides };
}

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let mockPagos: Record<string, jest.Mock>;
  let mockFacturas: Record<string, jest.Mock>;
  let mockPrisma: Record<string, Record<string, jest.Mock>>;
  let mockEncryption: Record<string, jest.Mock>;

  beforeEach(() => {
    mockPagos = { registrarPagoDesdeProveedor: jest.fn().mockResolvedValue(undefined) };
    mockFacturas = { registrarPagoDesdeProveedorFactura: jest.fn().mockResolvedValue(undefined) };
    mockPrisma = {
      intencionPago: { findUnique: jest.fn().mockResolvedValue(null) },
      intencionPagoFactura: { findUnique: jest.fn().mockResolvedValue(null) },
      junta: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    mockEncryption = { decrypt: jest.fn().mockReturnValue('secret-123') };

    controller = new WebhooksController(
      mockPagos as any,
      mockFacturas as any,
      mockPrisma as any,
      mockEncryption as any,
    );
  });

  it('debe ignorar eventos que no son transaction.updated', async () => {
    const body = makeBody({ event: 'payment.created' });
    const result = await controller.wompi(body as any, '');
    expect(result).toEqual({ received: true });
    expect(mockPrisma.intencionPago.findUnique).not.toHaveBeenCalled();
  });

  it('debe ignorar si no hay transacción en data', async () => {
    const body = makeBody();
    body.data = {} as any;
    const result = await controller.wompi(body as any, '');
    expect(result).toEqual({ received: true });
  });

  it('debe ignorar si status no es APPROVED', async () => {
    const body = makeBody();
    body.data.transaction.status = 'DECLINED';
    const result = await controller.wompi(body as any, '');
    expect(result).toEqual({ received: true });
  });

  it('debe ignorar si no hay payment_link_id', async () => {
    const body = makeBody();
    body.data.transaction.payment_link_id = null as any;
    const result = await controller.wompi(body as any, '');
    expect(result).toEqual({ received: true });
  });

  it('debe procesar rama junta con checksum válido', async () => {
    const secret = 'secret-123';
    const timestamp = 1736935200;
    const checksum = buildChecksumFor('tx-001', 'APPROVED', 100000, timestamp, secret);

    mockPrisma.intencionPago.findUnique.mockResolvedValue({ juntaId: 'j1' });
    mockPrisma.junta.findUnique.mockResolvedValue({ wompiEventsSecret: 'encrypted-secret' });
    mockEncryption.decrypt.mockReturnValue(secret);

    const body = makeBody();
    body.signature!.checksum = checksum;

    const result = await controller.wompi(body as any, checksum);

    expect(mockPagos.registrarPagoDesdeProveedor).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: 'tx-001' }),
    );
    expect(result).toEqual({ received: true });
  });

  it('debe rechazar checksum inválido en rama junta', async () => {
    mockPrisma.intencionPago.findUnique.mockResolvedValue({ juntaId: 'j1' });
    mockPrisma.junta.findUnique.mockResolvedValue({ wompiEventsSecret: 'encrypted' });
    mockEncryption.decrypt.mockReturnValue('secret-123');

    const body = makeBody();
    body.signature!.checksum = 'CHECKSUM_INVALIDO';

    await expect(controller.wompi(body as any, 'CHECKSUM_INVALIDO')).rejects.toThrow(
      'Checksum inválido',
    );
  });

  it('debe rechazar si junta no tiene webhook configurado', async () => {
    mockPrisma.intencionPago.findUnique.mockResolvedValue({ juntaId: 'j1' });
    mockPrisma.junta.findUnique.mockResolvedValue({ wompiEventsSecret: null });

    const body = makeBody();
    body.signature!.checksum = 'any';

    await expect(controller.wompi(body as any, 'any')).rejects.toThrow(
      'Junta sin webhook configurado',
    );
  });

  it('debe manejar pago duplicado sin error en rama junta', async () => {
    const secret = 'secret-123';
    const timestamp = 1736935200;
    const checksum = buildChecksumFor('tx-001', 'APPROVED', 100000, timestamp, secret);

    mockPrisma.intencionPago.findUnique.mockResolvedValue({ juntaId: 'j1' });
    mockPrisma.junta.findUnique.mockResolvedValue({ wompiEventsSecret: 'enc' });
    mockEncryption.decrypt.mockReturnValue(secret);

    const { PagoDuplicadoError } = await import('../../domain/errors/domain.errors');
    mockPagos.registrarPagoDesdeProveedor.mockRejectedValue(new PagoDuplicadoError('ref-1'));

    const body = makeBody();
    body.signature!.checksum = checksum;

    const result = await controller.wompi(body as any, checksum);
    expect(result).toEqual({ received: true });
  });

  it('debe procesar rama factura plataforma', async () => {
    process.env.WOMPI_EVENTS_SECRET = 'plat-secret';
    const timestamp = 1736935200;
    const checksum = buildChecksumFor('tx-001', 'APPROVED', 100000, timestamp, 'plat-secret');

    mockPrisma.intencionPago.findUnique.mockResolvedValue(null);
    mockPrisma.intencionPagoFactura.findUnique.mockResolvedValue({ id: 'if-1' });

    const body = makeBody();
    body.signature!.checksum = checksum;

    const result = await controller.wompi(body as any, checksum);

    expect(mockFacturas.registrarPagoDesdeProveedorFactura).toHaveBeenCalled();
    expect(result).toEqual({ received: true });

    delete process.env.WOMPI_EVENTS_SECRET;
  });

  it('debe fallar si plataforma no tiene WOMPI_EVENTS_SECRET', async () => {
    delete process.env.WOMPI_EVENTS_SECRET;

    mockPrisma.intencionPago.findUnique.mockResolvedValue(null);
    mockPrisma.intencionPagoFactura.findUnique.mockResolvedValue({ id: 'if-1' });

    const body = makeBody();
    body.signature!.checksum = 'any';

    await expect(controller.wompi(body as any, 'any')).rejects.toThrow(
      'Plataforma sin WOMPI_EVENTS_SECRET',
    );
  });

  it('debe retornar received:true si no encuentra ni intención junta ni factura', async () => {
    mockPrisma.intencionPago.findUnique.mockResolvedValue(null);
    mockPrisma.intencionPagoFactura.findUnique.mockResolvedValue(null);

    const body = makeBody();
    const result = await controller.wompi(body as any, '');
    expect(result).toEqual({ received: true });
  });
});

describe('WebhooksController – validarChecksumWompi (indirecta)', () => {
  it('debe rechazar si falta checksum en header y en body', async () => {
    const mockPrisma = {
      intencionPago: { findUnique: jest.fn().mockResolvedValue({ juntaId: 'j1' }) },
      intencionPagoFactura: { findUnique: jest.fn() },
      junta: { findUnique: jest.fn().mockResolvedValue({ wompiEventsSecret: 'enc' }) },
    };
    const mockEncryption = { decrypt: jest.fn().mockReturnValue('secret') };

    const controller = new WebhooksController(
      {} as any,
      {} as any,
      mockPrisma as any,
      mockEncryption as any,
    );

    const body = makeBody();
    delete (body as any).signature;

    await expect(controller.wompi(body as any, '')).rejects.toThrow('Falta checksum');
  });
});
