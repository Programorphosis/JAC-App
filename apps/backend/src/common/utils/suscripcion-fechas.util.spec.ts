import {
  calcularFechaVencimiento,
  getEstadoSuscripcion,
} from './suscripcion-fechas.util';

describe('calcularFechaVencimiento', () => {
  it('con diasPrueba > 0, suma días de prueba', () => {
    const inicio = new Date(2025, 0, 1); // 1 ene 2025
    const resultado = calcularFechaVencimiento({
      fechaInicio: inicio,
      diasPrueba: 15,
    });
    expect(resultado.getDate()).toBe(16);
    expect(resultado.getMonth()).toBe(0);
  });

  it('con diasPrueba = 0 y periodo mensual, suma 1 mes', () => {
    const inicio = new Date(2025, 0, 15); // 15 ene 2025
    const resultado = calcularFechaVencimiento({
      fechaInicio: inicio,
      diasPrueba: 0,
      periodo: 'mensual',
    });
    expect(resultado.getMonth()).toBe(1); // feb
    expect(resultado.getDate()).toBe(15);
  });

  it('con periodo anual, suma 1 año', () => {
    const inicio = new Date(2025, 5, 10); // 10 jun 2025
    const resultado = calcularFechaVencimiento({
      fechaInicio: inicio,
      periodo: 'anual',
    });
    expect(resultado.getFullYear()).toBe(2026);
    expect(resultado.getMonth()).toBe(5);
    expect(resultado.getDate()).toBe(10);
  });

  it('sin diasPrueba ni periodo, usa anual por defecto', () => {
    const inicio = new Date(2025, 0, 1);
    const resultado = calcularFechaVencimiento({ fechaInicio: inicio });
    expect(resultado.getFullYear()).toBe(2026);
  });

  it('maneja desbordamiento de mes (31 ene + 1 mes)', () => {
    const inicio = new Date(2025, 0, 31); // 31 ene
    const resultado = calcularFechaVencimiento({
      fechaInicio: inicio,
      periodo: 'mensual',
    });
    // JS desborda: feb no tiene 31 → 2 o 3 de marzo
    expect(resultado.getMonth()).toBe(2); // marzo
  });
});

describe('getEstadoSuscripcion', () => {
  it('retorna PRUEBA si diasPrueba > 0', () => {
    expect(getEstadoSuscripcion(15)).toBe('PRUEBA');
  });

  it('retorna ACTIVA si diasPrueba = 0', () => {
    expect(getEstadoSuscripcion(0)).toBe('ACTIVA');
  });

  it('retorna ACTIVA si diasPrueba es negativo', () => {
    expect(getEstadoSuscripcion(-1)).toBe('ACTIVA');
  });
});
