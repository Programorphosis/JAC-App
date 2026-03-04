import { AuditService } from './audit.service';
import type { IAuditEventStore } from '../ports/audit-event-store.port';

describe('AuditService', () => {
  let service: AuditService;
  let store: jest.Mocked<IAuditEventStore>;

  beforeEach(() => {
    store = { registerEvent: jest.fn().mockResolvedValue(undefined) };
    service = new AuditService(store);
  });

  it('delega el registro del evento al event store', async () => {
    const params = {
      juntaId: 'junta-1',
      entidad: 'Pago',
      entidadId: 'pago-1',
      accion: 'REGISTRO_PAGO_JUNTA',
      metadata: { monto: 50_000 },
      ejecutadoPorId: 'admin-1',
    };

    await service.registerEvent(params);

    expect(store.registerEvent).toHaveBeenCalledTimes(1);
    expect(store.registerEvent).toHaveBeenCalledWith(params);
  });

  it('propaga errores del event store', async () => {
    store.registerEvent.mockRejectedValue(new Error('DB connection lost'));

    await expect(
      service.registerEvent({
        juntaId: 'junta-1',
        entidad: 'Pago',
        entidadId: 'pago-1',
        accion: 'TEST',
        metadata: {},
        ejecutadoPorId: 'admin-1',
      }),
    ).rejects.toThrow('DB connection lost');
  });
});
