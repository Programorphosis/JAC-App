/**
 * Puerto para acceso a datos del EstadoGeneralService.
 * Referencia: definicionDomainServices.md, flujoSolicitudCarta.md
 *
 * Abstrae usuario y pago para mantener consistencia con DebtService (IDebtDataProvider).
 */
export interface IEstadoGeneralDataProvider {
  findUsuario(
    usuarioId: string,
    juntaId: string,
  ): Promise<{ id: string } | null>;

  countPagoCartaVigente(usuarioId: string, juntaId: string): Promise<number>;
}

export const ESTADO_GENERAL_DATA_PROVIDER = Symbol(
  'ESTADO_GENERAL_DATA_PROVIDER',
);
