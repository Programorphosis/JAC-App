import { RequisitoService } from './requisito.service';
import type { IRequisitoRepository } from '../ports/requisito-repository.port';
import type { IAuditEventStore } from '../ports/audit-event-store.port';

function createMockRepo(
  overrides: Partial<IRequisitoRepository> = {},
): jest.Mocked<IRequisitoRepository> {
  return {
    getEstadoRequisito: jest
      .fn()
      .mockResolvedValue({ estado: 'AL_DIA', obligacionActiva: true }),
    getRequisitosParaCarta: jest.fn().mockResolvedValue([]),
    updateEstadoRequisitoEstado: jest.fn().mockResolvedValue(undefined),
    updateEstadoRequisitoObligacion: jest.fn().mockResolvedValue(undefined),
    createHistorialRequisito: jest.fn().mockResolvedValue(undefined),
    getRequisitosYUsuariosParaCorte: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as jest.Mocked<IRequisitoRepository>;
}

function createMockAudit(): jest.Mocked<IAuditEventStore> {
  return { registerEvent: jest.fn().mockResolvedValue(undefined) };
}

describe('RequisitoService', () => {
  let service: RequisitoService;
  let repo: jest.Mocked<IRequisitoRepository>;
  let audit: jest.Mocked<IAuditEventStore>;

  const USR = 'usr-1';
  const JUNTA = 'junta-1';
  const REQ = 'req-tipo-1';
  const ADMIN = 'admin-1';

  beforeEach(() => {
    repo = createMockRepo();
    audit = createMockAudit();
    service = new RequisitoService(repo, audit);
  });

  // ═══════════════════════════════════════════════
  // updateEstadoRequisito
  // ═══════════════════════════════════════════════

  describe('updateEstadoRequisito', () => {
    it('cambia estado de AL_DIA a MORA correctamente', async () => {
      repo.getEstadoRequisito.mockResolvedValue({
        estado: 'AL_DIA',
        obligacionActiva: true,
      });

      await service.updateEstadoRequisito({
        requisitoTipoId: REQ,
        usuarioId: USR,
        juntaId: JUNTA,
        nuevoEstado: 'MORA',
        cambiadoPorId: ADMIN,
      });

      expect(repo.createHistorialRequisito).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoCambio: 'ESTADO',
          estadoAnterior: 'AL_DIA',
          estadoNuevo: 'MORA',
          cambiadoPorId: ADMIN,
          cambioAutomatico: false,
        }),
      );
      expect(repo.updateEstadoRequisitoEstado).toHaveBeenCalledWith(
        USR,
        REQ,
        'MORA',
      );
      expect(audit.registerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'CAMBIO_ESTADO_REQUISITO',
          entidadId: `${USR}:${REQ}`,
        }),
      );
    });

    it('cambia estado de MORA a AL_DIA', async () => {
      repo.getEstadoRequisito.mockResolvedValue({
        estado: 'MORA',
        obligacionActiva: true,
      });

      await service.updateEstadoRequisito({
        requisitoTipoId: REQ,
        usuarioId: USR,
        juntaId: JUNTA,
        nuevoEstado: 'AL_DIA',
        cambiadoPorId: ADMIN,
      });

      expect(repo.updateEstadoRequisitoEstado).toHaveBeenCalledWith(
        USR,
        REQ,
        'AL_DIA',
      );
    });

    it('lanza error si el estado ya es el mismo', async () => {
      repo.getEstadoRequisito.mockResolvedValue({
        estado: 'AL_DIA',
        obligacionActiva: true,
      });

      await expect(
        service.updateEstadoRequisito({
          requisitoTipoId: REQ,
          usuarioId: USR,
          juntaId: JUNTA,
          nuevoEstado: 'AL_DIA',
          cambiadoPorId: ADMIN,
        }),
      ).rejects.toThrow('No se requiere cambio');

      expect(repo.createHistorialRequisito).not.toHaveBeenCalled();
    });

    it('permite cambio si el estado actual es null (primer registro)', async () => {
      repo.getEstadoRequisito.mockResolvedValue(null);

      await service.updateEstadoRequisito({
        requisitoTipoId: REQ,
        usuarioId: USR,
        juntaId: JUNTA,
        nuevoEstado: 'AL_DIA',
        cambiadoPorId: ADMIN,
      });

      expect(repo.createHistorialRequisito).toHaveBeenCalledWith(
        expect.objectContaining({ estadoAnterior: null }),
      );
      expect(repo.updateEstadoRequisitoEstado).toHaveBeenCalledWith(
        USR,
        REQ,
        'AL_DIA',
      );
    });
  });

  // ═══════════════════════════════════════════════
  // updateObligacionRequisito
  // ═══════════════════════════════════════════════

  describe('updateObligacionRequisito', () => {
    it('cambia obligación de activa a inactiva', async () => {
      repo.getEstadoRequisito.mockResolvedValue({
        estado: 'AL_DIA',
        obligacionActiva: true,
      });

      await service.updateObligacionRequisito({
        requisitoTipoId: REQ,
        usuarioId: USR,
        juntaId: JUNTA,
        obligacionActiva: false,
        cambiadoPorId: ADMIN,
      });

      expect(repo.createHistorialRequisito).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoCambio: 'OBLIGACION',
          obligacionAnterior: true,
          obligacionNueva: false,
        }),
      );
      expect(repo.updateEstadoRequisitoObligacion).toHaveBeenCalledWith(
        USR,
        REQ,
        false,
      );
      expect(audit.registerEvent).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'CAMBIO_OBLIGACION_REQUISITO' }),
      );
    });

    it('lanza error si la obligación ya tiene el mismo valor', async () => {
      repo.getEstadoRequisito.mockResolvedValue({
        estado: 'AL_DIA',
        obligacionActiva: true,
      });

      await expect(
        service.updateObligacionRequisito({
          requisitoTipoId: REQ,
          usuarioId: USR,
          juntaId: JUNTA,
          obligacionActiva: true,
          cambiadoPorId: ADMIN,
        }),
      ).rejects.toThrow('No se requiere cambio');
    });
  });

  // ═══════════════════════════════════════════════
  // applyMonthlyCutoff
  // ═══════════════════════════════════════════════

  describe('applyMonthlyCutoff', () => {
    it('pasa todos los usuarios AL_DIA a MORA para cada requisito con corte automático', async () => {
      repo.getRequisitosYUsuariosParaCorte.mockResolvedValue([
        {
          requisitoTipoId: 'req-agua',
          juntaId: JUNTA,
          usuarios: [{ usuarioId: 'usr-1' }, { usuarioId: 'usr-2' }],
        },
      ]);

      await service.applyMonthlyCutoff({ ejecutadoPorId: 'system' });

      expect(repo.createHistorialRequisito).toHaveBeenCalledTimes(2);
      expect(repo.updateEstadoRequisitoEstado).toHaveBeenCalledTimes(2);
      expect(audit.registerEvent).toHaveBeenCalledTimes(2);

      expect(repo.createHistorialRequisito).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: 'usr-1',
          requisitoTipoId: 'req-agua',
          estadoAnterior: 'AL_DIA',
          estadoNuevo: 'MORA',
          cambioAutomatico: true,
        }),
      );

      expect(audit.registerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'CORTE_MENSUAL_REQUISITO',
          metadata: expect.objectContaining({ cambioAutomatico: true }),
        }),
      );
    });

    it('no hace nada si no hay requisitos con corte automático', async () => {
      repo.getRequisitosYUsuariosParaCorte.mockResolvedValue([]);

      await service.applyMonthlyCutoff({ ejecutadoPorId: 'system' });

      expect(repo.createHistorialRequisito).not.toHaveBeenCalled();
      expect(repo.updateEstadoRequisitoEstado).not.toHaveBeenCalled();
      expect(audit.registerEvent).not.toHaveBeenCalled();
    });

    it('procesa múltiples requisitos con múltiples usuarios', async () => {
      repo.getRequisitosYUsuariosParaCorte.mockResolvedValue([
        {
          requisitoTipoId: 'req-agua',
          juntaId: JUNTA,
          usuarios: [{ usuarioId: 'usr-1' }],
        },
        {
          requisitoTipoId: 'req-basura',
          juntaId: JUNTA,
          usuarios: [
            { usuarioId: 'usr-1' },
            { usuarioId: 'usr-2' },
            { usuarioId: 'usr-3' },
          ],
        },
      ]);

      await service.applyMonthlyCutoff({ ejecutadoPorId: 'system' });

      // 1 + 3 = 4 operaciones
      expect(repo.createHistorialRequisito).toHaveBeenCalledTimes(4);
      expect(repo.updateEstadoRequisitoEstado).toHaveBeenCalledTimes(4);
      expect(audit.registerEvent).toHaveBeenCalledTimes(4);
    });

    it('pasa juntaId al repositorio cuando se especifica', async () => {
      repo.getRequisitosYUsuariosParaCorte.mockResolvedValue([]);

      await service.applyMonthlyCutoff({
        juntaId: JUNTA,
        ejecutadoPorId: 'system',
      });

      expect(repo.getRequisitosYUsuariosParaCorte).toHaveBeenCalledWith(JUNTA);
    });

    it('no pasa juntaId al repositorio cuando no se especifica (todas las juntas)', async () => {
      repo.getRequisitosYUsuariosParaCorte.mockResolvedValue([]);

      await service.applyMonthlyCutoff({ ejecutadoPorId: 'system' });

      expect(repo.getRequisitosYUsuariosParaCorte).toHaveBeenCalledWith(
        undefined,
      );
    });
  });
});
