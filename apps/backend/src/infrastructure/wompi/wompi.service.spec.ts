import { WompiService } from './wompi.service';
import type { WompiCredenciales } from './wompi.types';

const mockFetch = jest.fn();
const originalFetch = global.fetch;

describe('WompiService', () => {
  let service: WompiService;
  const credencialesSandbox: WompiCredenciales = {
    privateKey: 'pk-sandbox-test-key',
    environment: 'sandbox',
  };
  const credencialesProduction: WompiCredenciales = {
    privateKey: 'pk-prod-test-key',
    environment: 'production',
  };

  beforeEach(() => {
    global.fetch = mockFetch as typeof fetch;
    service = new WompiService();
  });

  afterEach(() => {
    mockFetch.mockReset();
    global.fetch = originalFetch;
    delete process.env.WOMPI_ENVIRONMENT;
    delete process.env.WOMPI_PRIVATE_KEY;
  });

  describe('crearPaymentLink', () => {
    const params = {
      name: 'Pago cuota',
      description: 'Cuota mensual',
      amountInCents: 50000,
      currency: 'COP',
      singleUse: true,
      redirectUrl: 'https://app.com/callback',
      sku: 'SKU-001',
    };

    it('should call sandbox URL for sandbox environment', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { id: 'pl-sandbox-123', name: params.name },
          }),
      });

      await service.crearPaymentLink(params, credencialesSandbox);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox.wompi.co/v1/payment_links',
        expect.any(Object),
      );
    });

    it('should call production URL for production environment', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { id: 'pl-prod-456', name: params.name },
          }),
      });

      await service.crearPaymentLink(params, credencialesProduction);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://production.wompi.co/v1/payment_links',
        expect.any(Object),
      );
    });

    it('should send correct headers with Bearer token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ data: { id: 'pl-123' } }),
      });

      await service.crearPaymentLink(params, credencialesSandbox);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer pk-sandbox-test-key',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should send correct body format (snake_case)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ data: { id: 'pl-123' } }),
      });

      await service.crearPaymentLink(params, credencialesSandbox);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody).toEqual({
        name: params.name,
        description: params.description,
        amount_in_cents: params.amountInCents,
        currency: params.currency,
        single_use: params.singleUse,
        collect_shipping: false,
        redirect_url: params.redirectUrl,
        sku: params.sku,
      });
    });

    it('should return the link id from response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ data: { id: 'pl-link-789' } }),
      });

      const result = await service.crearPaymentLink(params, credencialesSandbox);

      expect(result).toEqual({ id: 'pl-link-789' });
    });

    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(
        service.crearPaymentLink(params, credencialesSandbox),
      ).rejects.toThrow('Wompi API error 401: Unauthorized');
    });

    it('should use env credentials when none provided', async () => {
      process.env.WOMPI_ENVIRONMENT = 'sandbox';
      process.env.WOMPI_PRIVATE_KEY = 'pk-env-key';

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ data: { id: 'pl-env-123' } }),
      });

      await service.crearPaymentLink(params);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox.wompi.co/v1/payment_links',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer pk-env-key',
          }),
        }),
      );
    });
  });

  describe('obtenerPaymentLink', () => {
    it('should return payment link data with transactions', async () => {
      const paymentLinkId = 'pl-abc-123';
      const mockData = {
        id: paymentLinkId,
        transactions: [
          {
            id: 'tx-1',
            status: 'APPROVED',
            amount_in_cents: 50000,
            reference: 'ref-001',
            payment_link_id: paymentLinkId,
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData }),
      });

      const result = await service.obtenerPaymentLink(
        paymentLinkId,
        credencialesSandbox,
      );

      expect(result).toEqual({
        id: paymentLinkId,
        transactions: mockData.transactions,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        `https://sandbox.wompi.co/v1/payment_links/${paymentLinkId}`,
        expect.objectContaining({
          headers: { Authorization: 'Bearer pk-sandbox-test-key' },
        }),
      );
    });

    it('should return null on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await service.obtenerPaymentLink(
        'pl-not-found',
        credencialesSandbox,
      );

      expect(result).toBeNull();
    });

    it('should return null on fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.obtenerPaymentLink(
        'pl-any',
        credencialesSandbox,
      );

      expect(result).toBeNull();
    });

    it('should use env credentials when none provided', async () => {
      process.env.WOMPI_ENVIRONMENT = 'production';
      process.env.WOMPI_PRIVATE_KEY = 'pk-env-payment-link';

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { id: 'pl-env-456', transactions: [] },
          }),
      });

      const result = await service.obtenerPaymentLink('pl-env-456');

      expect(result).toEqual({ id: 'pl-env-456', transactions: [] });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://production.wompi.co/v1/payment_links/pl-env-456',
        expect.objectContaining({
          headers: { Authorization: 'Bearer pk-env-payment-link' },
        }),
      );
    });
  });

  describe('obtenerTransaccion', () => {
    it('should return transaction data', async () => {
      const transactionId = 'tx-xyz-789';
      const mockData = {
        id: transactionId,
        status: 'APPROVED',
        amount_in_cents: 75000,
        currency: 'COP',
        reference: 'ref-002',
        payment_link_id: 'pl-123',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData }),
      });

      const result = await service.obtenerTransaccion(
        transactionId,
        credencialesSandbox,
      );

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://sandbox.wompi.co/v1/transactions/${transactionId}`,
        expect.objectContaining({
          headers: { Authorization: 'Bearer pk-sandbox-test-key' },
        }),
      );
    });

    it('should return null on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await service.obtenerTransaccion(
        'tx-not-found',
        credencialesSandbox,
      );

      expect(result).toBeNull();
    });

    it('should return null on fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));

      const result = await service.obtenerTransaccion(
        'tx-any',
        credencialesSandbox,
      );

      expect(result).toBeNull();
    });

    it('should use env credentials when none provided', async () => {
      process.env.WOMPI_ENVIRONMENT = 'sandbox';
      process.env.WOMPI_PRIVATE_KEY = 'pk-env-transaction';

      const mockData = {
        id: 'tx-env-999',
        status: 'APPROVED',
        amount_in_cents: 100000,
        currency: 'COP',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData }),
      });

      const result = await service.obtenerTransaccion('tx-env-999');

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox.wompi.co/v1/transactions/tx-env-999',
        expect.objectContaining({
          headers: { Authorization: 'Bearer pk-env-transaction' },
        }),
      );
    });
  });
});
