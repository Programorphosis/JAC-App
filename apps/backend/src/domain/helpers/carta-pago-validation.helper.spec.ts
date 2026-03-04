import { validateCartaPagoPreconditions, type CartaPagoValidationInput } from './carta-pago-validation.helper';

function baseInput(overrides: Partial<CartaPagoValidationInput> = {}): CartaPagoValidationInput {
  return {
    junta: { montoCarta: 15_000 },
    usuario: { id: 'usr-1' },
    cartaPendiente: null,
    tienePagoVigente: null,
    cartaVigente: null,
    usuarioId: 'usr-1',
    juntaId: 'junta-1',
    ...overrides,
  };
}

describe('validateCartaPagoPreconditions', () => {
  it('no lanza error cuando todas las precondiciones se cumplen', () => {
    expect(() => validateCartaPagoPreconditions(baseInput())).not.toThrow();
  });

  it('lanza error si el usuario no existe', () => {
    expect(() =>
      validateCartaPagoPreconditions(baseInput({ usuario: null })),
    ).toThrow('no encontrado');
  });

  it('lanza error si la junta no tiene montoCarta', () => {
    expect(() =>
      validateCartaPagoPreconditions(baseInput({ junta: { montoCarta: null } })),
    ).toThrow('monto de carta');
  });

  it('lanza error si montoCarta es 0', () => {
    expect(() =>
      validateCartaPagoPreconditions(baseInput({ junta: { montoCarta: 0 } })),
    ).toThrow('monto de carta');
  });

  it('lanza error si montoCarta es negativo', () => {
    expect(() =>
      validateCartaPagoPreconditions(baseInput({ junta: { montoCarta: -1 } })),
    ).toThrow('monto de carta');
  });

  it('lanza error si la junta es null', () => {
    expect(() =>
      validateCartaPagoPreconditions(baseInput({ junta: null })),
    ).toThrow('monto de carta');
  });

  it('lanza error si hay carta pendiente', () => {
    expect(() =>
      validateCartaPagoPreconditions(baseInput({ cartaPendiente: { id: 'carta-pending' } })),
    ).toThrow('pago de carta pendiente');
  });

  it('lanza error si hay pago carta vigente', () => {
    expect(() =>
      validateCartaPagoPreconditions(baseInput({ tienePagoVigente: true })),
    ).toThrow('pago de carta pendiente');
  });

  it('lanza error si hay carta vigente', () => {
    expect(() =>
      validateCartaPagoPreconditions(baseInput({ cartaVigente: { id: 'carta-vigente' } })),
    ).toThrow('carta vigente');
  });

  it('valida en orden: usuario → monto → pendiente → vigente', () => {
    expect(() =>
      validateCartaPagoPreconditions(
        baseInput({ usuario: null, junta: { montoCarta: null } }),
      ),
    ).toThrow('no encontrado');
  });
});
