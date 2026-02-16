/**
 * Errores de dominio.
 * Fase 1.2 – Referencia: definicionDomainServices.md
 */

export {
  DomainError,
  SinHistorialLaboralError,
  SinTarifaVigenteError,
  HistorialLaboralSuperpuestoError,
  DeudaCeroError,
  MontoIncorrectoError,
  PagoDuplicadoError,
  PagoCartaPendienteError,
  RequisitosCartaNoCumplidosError,
  CartaNoPendienteError,
  UsuarioNoEncontradoError,
  EstadoRequisitoMismoEstadoError,
  EstadoRequisitoMismaObligacionError,
  RequisitoTipoNoEncontradoError,
  CartaPendienteExistenteError,
  CartaNoEncontradaError,
  DocumentoNoEncontradoError,
  TipoDocumentoNoPermitidoError,
  MontoCartaNoConfiguradoError,
  CartaVigenteError,
  IntencionPagoNoEncontradaError,
  BootstrapYaEjecutadoError,
  AlmacenamientoNoConfiguradoError,
  ArchivoSobrepasaTamanioError,
  FormatoArchivoNoPermitidoError,
} from './domain.errors';
