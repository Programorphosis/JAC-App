import {
  validarTelefonoColombia,
  normalizarTelefonoColombia,
} from './validacion-telefono.util';

describe('validarTelefonoColombia', () => {
  it('acepta 10 dígitos (3001234567)', () => {
    expect(validarTelefonoColombia('3001234567')).toBe(true);
  });

  it('acepta con prefijo 57 (573001234567)', () => {
    expect(validarTelefonoColombia('573001234567')).toBe(true);
  });

  it('acepta con prefijo +57 (+573001234567)', () => {
    expect(validarTelefonoColombia('+573001234567')).toBe(true);
  });

  it('acepta con espacios intermedios', () => {
    expect(validarTelefonoColombia('300 123 4567')).toBe(true);
  });

  it('rechaza menos de 10 dígitos', () => {
    expect(validarTelefonoColombia('300123')).toBe(false);
  });

  it('rechaza más de 10 dígitos sin prefijo', () => {
    expect(validarTelefonoColombia('30012345678')).toBe(false);
  });

  it('rechaza null', () => {
    expect(validarTelefonoColombia(null)).toBe(false);
  });

  it('rechaza undefined', () => {
    expect(validarTelefonoColombia(undefined)).toBe(false);
  });

  it('rechaza string vacío', () => {
    expect(validarTelefonoColombia('')).toBe(false);
  });

  it('rechaza letras', () => {
    expect(validarTelefonoColombia('abcdefghij')).toBe(false);
  });
});

describe('normalizarTelefonoColombia', () => {
  it('normaliza 10 dígitos a +57XXXXXXXXXX', () => {
    expect(normalizarTelefonoColombia('3001234567')).toBe('+573001234567');
  });

  it('normaliza con prefijo 57', () => {
    expect(normalizarTelefonoColombia('573001234567')).toBe('+573001234567');
  });

  it('normaliza con prefijo +57', () => {
    expect(normalizarTelefonoColombia('+573001234567')).toBe('+573001234567');
  });

  it('normaliza con espacios', () => {
    expect(normalizarTelefonoColombia('300 123 4567')).toBe('+573001234567');
  });

  it('retorna null para entrada inválida', () => {
    expect(normalizarTelefonoColombia('123')).toBeNull();
  });

  it('retorna null para null', () => {
    expect(normalizarTelefonoColombia(null)).toBeNull();
  });

  it('retorna null para undefined', () => {
    expect(normalizarTelefonoColombia(undefined)).toBeNull();
  });
});
