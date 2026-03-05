import { DebtService } from './debt.service';
import type { IDebtDataProvider } from '../ports/debt-data-provider.port';
import type { EstadoLaboralTipo } from '../types/debt.types';

/**
 * Helper: crea fechas en hora local (evita problemas con UTC de new Date('YYYY-MM-DD')).
 */
function localDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function createMockDataProvider(
  overrides: Partial<IDebtDataProvider> = {},
): IDebtDataProvider {
  return {
    getUsuarioParaCalculo: jest.fn().mockResolvedValue(null),
    getUltimoPagoJunta: jest.fn().mockResolvedValue(null),
    getEstadoLaboralEnMes: jest
      .fn()
      .mockResolvedValue('TRABAJANDO' as EstadoLaboralTipo),
    getTarifaVigente: jest.fn().mockResolvedValue(50_000),
    ...overrides,
  };
}

describe('DebtService', () => {
  let service: DebtService;
  let dp: jest.Mocked<IDebtDataProvider>;

  const USR = 'usr-1';
  const JUNTA = 'junta-1';

  beforeEach(() => {
    dp = createMockDataProvider() as jest.Mocked<IDebtDataProvider>;
    service = new DebtService(dp);
  });

  // ──────────────────────────────────────────────
  // Caso: usuario no existe
  // ──────────────────────────────────────────────
  it('lanza UsuarioNoEncontradoError si el usuario no existe', async () => {
    dp.getUsuarioParaCalculo.mockResolvedValue(null);

    await expect(
      service.calculateUserDebt({ usuarioId: USR, juntaId: JUNTA }),
    ).rejects.toThrow('no encontrado');
  });

  // ──────────────────────────────────────────────
  // Caso: usuario al día (sin deuda)
  // ──────────────────────────────────────────────
  it('retorna deuda 0 si el último pago cubre hasta el mes anterior al corte', async () => {
    dp.getUsuarioParaCalculo.mockResolvedValue({
      fechaCreacion: localDate(2024, 1, 15),
    });
    dp.getUltimoPagoJunta.mockResolvedValue({
      fechaPago: localDate(2025, 2, 10),
    });

    const result = await service.calculateUserDebt({
      usuarioId: USR,
      juntaId: JUNTA,
      fechaCorte: localDate(2025, 3, 1),
    });

    expect(result.total).toBe(0);
    expect(result.detalle).toHaveLength(0);
  });

  // ──────────────────────────────────────────────
  // Caso: usuario nuevo sin pagos, debe 3 meses
  // ──────────────────────────────────────────────
  it('calcula deuda correcta para usuario nuevo sin pagos', async () => {
    dp.getUsuarioParaCalculo.mockResolvedValue({
      fechaCreacion: localDate(2025, 1, 10),
    });
    dp.getUltimoPagoJunta.mockResolvedValue(null);
    dp.getEstadoLaboralEnMes.mockResolvedValue('TRABAJANDO');
    dp.getTarifaVigente.mockResolvedValue(50_000);

    const result = await service.calculateUserDebt({
      usuarioId: USR,
      juntaId: JUNTA,
      fechaCorte: localDate(2025, 4, 15),
    });

    // Enero, Febrero, Marzo = 3 meses × $50.000
    expect(result.total).toBe(150_000);
    expect(result.detalle).toHaveLength(3);
    expect(result.detalle[0]).toEqual({
      year: 2025,
      month: 1,
      estadoLaboral: 'TRABAJANDO',
      tarifaAplicada: 50_000,
    });
    expect(result.detalle[2]).toEqual({
      year: 2025,
      month: 3,
      estadoLaboral: 'TRABAJANDO',
      tarifaAplicada: 50_000,
    });
  });

  // ──────────────────────────────────────────────
  // Caso: tarifas distintas por estado laboral
  // ──────────────────────────────────────────────
  it('aplica tarifas distintas según estado laboral de cada mes', async () => {
    dp.getUsuarioParaCalculo.mockResolvedValue({
      fechaCreacion: localDate(2025, 1, 1),
    });
    dp.getUltimoPagoJunta.mockResolvedValue(null);

    dp.getEstadoLaboralEnMes
      .mockResolvedValueOnce('TRABAJANDO')
      .mockResolvedValueOnce('NO_TRABAJANDO')
      .mockResolvedValueOnce('TRABAJANDO');

    dp.getTarifaVigente
      .mockResolvedValueOnce(50_000)
      .mockResolvedValueOnce(25_000)
      .mockResolvedValueOnce(50_000);

    const result = await service.calculateUserDebt({
      usuarioId: USR,
      juntaId: JUNTA,
      fechaCorte: localDate(2025, 4, 15),
    });

    expect(result.total).toBe(125_000);
    expect(result.detalle).toEqual([
      {
        year: 2025,
        month: 1,
        estadoLaboral: 'TRABAJANDO',
        tarifaAplicada: 50_000,
      },
      {
        year: 2025,
        month: 2,
        estadoLaboral: 'NO_TRABAJANDO',
        tarifaAplicada: 25_000,
      },
      {
        year: 2025,
        month: 3,
        estadoLaboral: 'TRABAJANDO',
        tarifaAplicada: 50_000,
      },
    ]);
  });

  // ──────────────────────────────────────────────
  // Caso: usuario con pago previo, deuda parcial
  // ──────────────────────────────────────────────
  it('calcula deuda desde el mes siguiente al último pago', async () => {
    dp.getUsuarioParaCalculo.mockResolvedValue({
      fechaCreacion: localDate(2024, 6, 1),
    });
    dp.getUltimoPagoJunta.mockResolvedValue({
      fechaPago: localDate(2025, 1, 15),
    });
    dp.getEstadoLaboralEnMes.mockResolvedValue('TRABAJANDO');
    dp.getTarifaVigente.mockResolvedValue(40_000);

    const result = await service.calculateUserDebt({
      usuarioId: USR,
      juntaId: JUNTA,
      fechaCorte: localDate(2025, 4, 10),
    });

    // Feb + Mar = 2 meses × $40.000
    expect(result.total).toBe(80_000);
    expect(result.detalle).toHaveLength(2);
    expect(result.detalle[0].month).toBe(2);
    expect(result.detalle[1].month).toBe(3);
  });

  // ──────────────────────────────────────────────
  // Caso: usuario creado en el mes actual (sin meses vencidos)
  // ──────────────────────────────────────────────
  it('retorna deuda 0 si el usuario fue creado en el mes del corte', async () => {
    dp.getUsuarioParaCalculo.mockResolvedValue({
      fechaCreacion: localDate(2025, 3, 20),
    });
    dp.getUltimoPagoJunta.mockResolvedValue(null);

    const result = await service.calculateUserDebt({
      usuarioId: USR,
      juntaId: JUNTA,
      fechaCorte: localDate(2025, 3, 25),
    });

    expect(result.total).toBe(0);
    expect(result.detalle).toHaveLength(0);
  });

  // ──────────────────────────────────────────────
  // Caso: consulta estado laboral y tarifa para cada mes
  // ──────────────────────────────────────────────
  it('consulta el data provider con los parámetros correctos para cada mes', async () => {
    dp.getUsuarioParaCalculo.mockResolvedValue({
      fechaCreacion: localDate(2025, 1, 1),
    });
    dp.getUltimoPagoJunta.mockResolvedValue(null);
    dp.getEstadoLaboralEnMes.mockResolvedValue('TRABAJANDO');
    dp.getTarifaVigente.mockResolvedValue(50_000);

    await service.calculateUserDebt({
      usuarioId: USR,
      juntaId: JUNTA,
      fechaCorte: localDate(2025, 3, 15),
    });

    // Debe consultar enero y febrero
    expect(dp.getEstadoLaboralEnMes).toHaveBeenCalledWith(USR, JUNTA, 2025, 1);
    expect(dp.getEstadoLaboralEnMes).toHaveBeenCalledWith(USR, JUNTA, 2025, 2);
    expect(dp.getTarifaVigente).toHaveBeenCalledWith(
      JUNTA,
      'TRABAJANDO',
      2025,
      1,
    );
    expect(dp.getTarifaVigente).toHaveBeenCalledWith(
      JUNTA,
      'TRABAJANDO',
      2025,
      2,
    );
  });

  // ──────────────────────────────────────────────
  // Caso: usa la fecha actual si no se pasa fechaCorte
  // ──────────────────────────────────────────────
  it('usa la fecha actual como corte cuando fechaCorte no se proporciona', async () => {
    dp.getUsuarioParaCalculo.mockResolvedValue({
      fechaCreacion: localDate(2020, 1, 1),
    });
    dp.getUltimoPagoJunta.mockResolvedValue({ fechaPago: new Date() });

    const result = await service.calculateUserDebt({
      usuarioId: USR,
      juntaId: JUNTA,
    });

    expect(result.total).toBe(0);
  });

  // ──────────────────────────────────────────────
  // Caso: deuda cruzando años
  // ──────────────────────────────────────────────
  it('calcula correctamente deuda que cruza fin de año', async () => {
    dp.getUsuarioParaCalculo.mockResolvedValue({
      fechaCreacion: localDate(2024, 11, 1),
    });
    dp.getUltimoPagoJunta.mockResolvedValue(null);
    dp.getEstadoLaboralEnMes.mockResolvedValue('TRABAJANDO');
    dp.getTarifaVigente.mockResolvedValue(30_000);

    const result = await service.calculateUserDebt({
      usuarioId: USR,
      juntaId: JUNTA,
      fechaCorte: localDate(2025, 3, 10),
    });

    // Nov 2024, Dic 2024, Ene 2025, Feb 2025 = 4 meses
    expect(result.total).toBe(120_000);
    expect(result.detalle).toHaveLength(4);
    expect(result.detalle[0]).toEqual({
      year: 2024,
      month: 11,
      estadoLaboral: 'TRABAJANDO',
      tarifaAplicada: 30_000,
    });
    expect(result.detalle[3]).toEqual({
      year: 2025,
      month: 2,
      estadoLaboral: 'TRABAJANDO',
      tarifaAplicada: 30_000,
    });
  });
});
