/**
 * Helper para validar precondiciones de pago CARTA.
 * Centraliza la lógica compartida entre PagosService.crearIntencionPagoCartaOnline
 * y PaymentRegistrationRunner.registerCartaPayment.
 * Referencia: flujoSolicitudCarta.md, vigenciaPagoCarta.md
 */
import {
  UsuarioNoEncontradoError,
  MontoCartaNoConfiguradoError,
  PagoCartaPendienteError,
  CartaVigenteError,
} from '../errors';

export interface CartaPagoValidationInput {
  junta: { montoCarta: number | null } | null;
  usuario: { id: string } | null;
  cartaPendiente: unknown;
  tienePagoVigente: unknown;
  cartaVigente: unknown;
  usuarioId: string;
  juntaId: string;
}

/**
 * Valida que se pueda registrar un pago CARTA para el usuario.
 * Lanza DomainError si alguna precondición no se cumple.
 */
export function validateCartaPagoPreconditions(
  input: CartaPagoValidationInput,
): void {
  const {
    junta,
    usuario,
    cartaPendiente,
    tienePagoVigente,
    cartaVigente,
    usuarioId,
  } = input;

  if (!usuario) {
    throw new UsuarioNoEncontradoError(usuarioId);
  }
  if (!junta?.montoCarta || junta.montoCarta <= 0) {
    throw new MontoCartaNoConfiguradoError(input.juntaId);
  }
  if (cartaPendiente || tienePagoVigente) {
    throw new PagoCartaPendienteError(usuarioId);
  }
  if (cartaVigente) {
    throw new CartaVigenteError(usuarioId);
  }
}
