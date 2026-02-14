/**
 * Puerto para operaciones de requisitos adicionales (RequisitoTipo, EstadoRequisito, HistorialRequisito).
 * RequisitoService es el único autorizado para modificar estas entidades.
 * Referencia: definicionDomainServices.md, flujoRequisitosAdicionales.md
 */

import type { EstadoRequisitoTipo } from '../types/requisito.types';

export const REQUISITO_REPOSITORY = Symbol('REQUISITO_REPOSITORY');

export interface EstadoRequisitoActual {
  estado: EstadoRequisitoTipo;
  obligacionActiva: boolean;
}

export interface UsuarioParaCorte {
  usuarioId: string;
}

export interface RequisitoParaCarta {
  requisitoTipoId: string;
  nombre: string;
  obligacionActiva: boolean;
  estado: EstadoRequisitoTipo;
}

export interface IRequisitoRepository {
  getEstadoRequisito(
    usuarioId: string,
    requisitoTipoId: string,
    juntaId: string,
  ): Promise<EstadoRequisitoActual | null>;

  getRequisitosParaCarta(
    usuarioId: string,
    juntaId: string,
  ): Promise<RequisitoParaCarta[]>;

  updateEstadoRequisitoEstado(
    usuarioId: string,
    requisitoTipoId: string,
    nuevoEstado: EstadoRequisitoTipo,
  ): Promise<void>;

  updateEstadoRequisitoObligacion(
    usuarioId: string,
    requisitoTipoId: string,
    obligacionActiva: boolean,
  ): Promise<void>;

  createHistorialRequisito(data: {
    usuarioId: string;
    requisitoTipoId: string;
    tipoCambio: 'ESTADO' | 'OBLIGACION';
    estadoAnterior?: EstadoRequisitoTipo | null;
    estadoNuevo?: EstadoRequisitoTipo | null;
    obligacionAnterior?: boolean | null;
    obligacionNueva?: boolean | null;
    cambiadoPorId?: string | null;
    cambioAutomatico?: boolean;
  }): Promise<void>;

  /** Requisitos con tieneCorteAutomatico=true y activo=true. Para cada uno, usuarios con obligacionActiva y AL_DIA. */
  getRequisitosYUsuariosParaCorte(
    juntaId?: string,
  ): Promise<Array<{ requisitoTipoId: string; juntaId: string; usuarios: UsuarioParaCorte[] }>>;
}
