/**
 * Puerto para operaciones de agua (EstadoAgua, HistorialAgua).
 * WaterService es el único autorizado para modificar estas entidades.
 * Referencia: definicionDomainServices.md, flujoReceptorDeAgua.md
 */

import type { EstadoAguaTipo } from '../types/water.types';

export const WATER_REPOSITORY = Symbol('WATER_REPOSITORY');

export interface EstadoAguaActual {
  estado: EstadoAguaTipo;
  obligacionActiva: boolean;
}

export interface UsuarioParaCorte {
  usuarioId: string;
}

export interface IWaterRepository {
  getEstadoAgua(usuarioId: string, juntaId: string): Promise<EstadoAguaActual | null>;

  updateEstadoAguaEstado(
    usuarioId: string,
    nuevoEstado: EstadoAguaTipo,
  ): Promise<void>;

  updateEstadoAguaObligacion(
    usuarioId: string,
    obligacionActiva: boolean,
  ): Promise<void>;

  createHistorialAgua(data: {
    usuarioId: string;
    tipoCambio: 'ESTADO' | 'OBLIGACION';
    estadoAnterior?: EstadoAguaTipo | null;
    estadoNuevo?: EstadoAguaTipo | null;
    obligacionAnterior?: boolean | null;
    obligacionNueva?: boolean | null;
    cambiadoPorId?: string | null;
    cambioAutomatico?: boolean;
  }): Promise<void>;

  getUsuariosParaCorteMensual(juntaId: string): Promise<UsuarioParaCorte[]>;
}
