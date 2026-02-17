/**
 * Errores de dominio – framework-agnósticos.
 * Referencia: definicionDomainServices.md
 *
 * Los servicios de dominio lanzan estos errores. Los controllers/guards
 * los traducen a HttpException cuando corresponda.
 */

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'DomainError';
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

// DebtService
export class SinHistorialLaboralError extends DomainError {
  constructor(usuarioId: string) {
    super(`Usuario ${usuarioId} no tiene historial laboral`, 'SIN_HISTORIAL_LABORAL');
    this.name = 'SinHistorialLaboralError';
  }
}

export class SinTarifaVigenteError extends DomainError {
  constructor(juntaId: string, year: number, month: number) {
    super(
      `No hay tarifa vigente para junta ${juntaId} en ${year}-${month}`,
      'SIN_TARIFA_VIGENTE',
    );
    this.name = 'SinTarifaVigenteError';
  }
}

export class HistorialLaboralSuperpuestoError extends DomainError {
  constructor(usuarioId: string) {
    super(`Historial laboral con superposición para usuario ${usuarioId}`, 'HISTORIAL_SUPERPUESTO');
    this.name = 'HistorialLaboralSuperpuestoError';
  }
}

// PaymentService
export class DeudaCeroError extends DomainError {
  constructor(usuarioId: string) {
    super(`Usuario ${usuarioId} ya está al día, no hay deuda por pagar`, 'DEUDA_CERO');
    this.name = 'DeudaCeroError';
  }
}

export class MontoIncorrectoError extends DomainError {
  constructor(esperado: number, recibido: number) {
    super(`Monto incorrecto: esperado ${esperado}, recibido ${recibido}`, 'MONTO_INCORRECTO');
    this.name = 'MontoIncorrectoError';
  }
}

export class PagoDuplicadoError extends DomainError {
  constructor(referenciaExterna: string) {
    super(`Pago ya registrado con referencia ${referenciaExterna}`, 'PAGO_DUPLICADO');
    this.name = 'PagoDuplicadoError';
  }
}

/** No permitir nuevo pago carta si ya existe uno sin usar (carta PENDIENTE). */
export class PagoCartaPendienteError extends DomainError {
  constructor(usuarioId: string) {
    super(
      `Ya existe un pago de carta pendiente de usar para este usuario. No se puede registrar otro pago hasta que se expida o rechace la carta.`,
      'PAGO_CARTA_PENDIENTE',
    );
    this.name = 'PagoCartaPendienteError';
  }
}

// LetterService
export class RequisitosCartaNoCumplidosError extends DomainError {
  constructor(motivo: string) {
    super(`Requisitos de carta no cumplidos: ${motivo}`, 'REQUISITOS_CARTA_NO_CUMPLIDOS');
    this.name = 'RequisitosCartaNoCumplidosError';
  }
}

export class CartaNoPendienteError extends DomainError {
  constructor(cartaId: string) {
    super(`Carta ${cartaId} no está en estado PENDIENTE`, 'CARTA_NO_PENDIENTE');
    this.name = 'CartaNoPendienteError';
  }
}

// RequisitoService
export class UsuarioNoEncontradoError extends DomainError {
  constructor(usuarioId: string) {
    super(`Usuario ${usuarioId} no encontrado`, 'USUARIO_NO_ENCONTRADO');
    this.name = 'UsuarioNoEncontradoError';
  }
}

export class EstadoRequisitoMismoEstadoError extends DomainError {
  constructor(usuarioId: string, requisitoTipoId: string, estado: string) {
    super(
      `Usuario ${usuarioId} ya tiene estado ${estado} en el requisito. No se requiere cambio.`,
      'ESTADO_REQUISITO_MISMO_ESTADO',
    );
    this.name = 'EstadoRequisitoMismoEstadoError';
  }
}

export class EstadoRequisitoMismaObligacionError extends DomainError {
  constructor(usuarioId: string, requisitoTipoId: string) {
    super(
      `Usuario ${usuarioId} ya tiene esa obligación en el requisito. No se requiere cambio.`,
      'ESTADO_REQUISITO_MISMA_OBLIGACION',
    );
    this.name = 'EstadoRequisitoMismaObligacionError';
  }
}

export class RequisitoTipoNoEncontradoError extends DomainError {
  constructor(requisitoTipoId: string) {
    super(`Requisito tipo ${requisitoTipoId} no encontrado`, 'REQUISITO_TIPO_NO_ENCONTRADO');
    this.name = 'RequisitoTipoNoEncontradoError';
  }
}

// Cartas / Documentos / Pagos – errores de aplicación
export class CartaPendienteExistenteError extends DomainError {
  constructor(usuarioId: string) {
    super(
      'Ya existe una carta pendiente para este usuario. Debe esperar a que se valide o rechace.',
      'CARTA_PENDIENTE_EXISTENTE',
    );
    this.name = 'CartaPendienteExistenteError';
  }
}

export class CartaNoEncontradaError extends DomainError {
  constructor(cartaId: string) {
    super(`Carta ${cartaId} no encontrada o sin PDF disponible`, 'CARTA_NO_ENCONTRADA');
    this.name = 'CartaNoEncontradaError';
  }
}

export class DocumentoNoEncontradoError extends DomainError {
  constructor() {
    super('Documento no encontrado', 'DOCUMENTO_NO_ENCONTRADO');
    this.name = 'DocumentoNoEncontradoError';
  }
}

export class TipoDocumentoNoPermitidoError extends DomainError {
  constructor(tipo: string) {
    super(`Tipo de documento no permitido: ${tipo}`, 'TIPO_DOCUMENTO_NO_PERMITIDO');
    this.name = 'TipoDocumentoNoPermitidoError';
  }
}

export class MontoCartaNoConfiguradoError extends DomainError {
  constructor(juntaId: string) {
    super('La junta no tiene monto de carta configurado', 'MONTO_CARTA_NO_CONFIGURADO');
    this.name = 'MontoCartaNoConfiguradoError';
  }
}

export class CartaVigenteError extends DomainError {
  constructor(usuarioId: string) {
    super(
      'Tiene una carta vigente. Debe esperar a que venza para poder pagar otra.',
      'CARTA_VIGENTE',
    );
    this.name = 'CartaVigenteError';
  }
}

export class IntencionPagoNoEncontradaError extends DomainError {
  constructor() {
    super('Intención de pago no encontrada o monto no coincide', 'INTENCION_PAGO_NO_ENCONTRADA');
    this.name = 'IntencionPagoNoEncontradaError';
  }
}

/** Junta sin credenciales Wompi configuradas. WOMPI_POR_JUNTA_DOC §8 */
export class WompiNoConfiguradoError extends DomainError {
  constructor(juntaId: string) {
    super(
      'Tu junta no tiene configurados los pagos online. Comunícate con el administrador de tu junta para más información.',
      'WOMPI_NO_CONFIGURADO',
    );
    this.name = 'WompiNoConfiguradoError';
  }
}

export class BootstrapYaEjecutadoError extends DomainError {
  constructor() {
    super('Bootstrap ya fue ejecutado. No se puede repetir.', 'BOOTSTRAP_YA_EJECUTADO');
    this.name = 'BootstrapYaEjecutadoError';
  }
}

export class AlmacenamientoNoConfiguradoError extends DomainError {
  constructor() {
    super('El almacenamiento S3 no está configurado', 'ALMACENAMIENTO_NO_CONFIGURADO');
    this.name = 'AlmacenamientoNoConfiguradoError';
  }
}

export class ArchivoSobrepasaTamanioError extends DomainError {
  constructor(maxMb: number) {
    super(`El archivo supera el tamaño máximo de ${maxMb} MB`, 'ARCHIVO_SOBREPASA_TAMANIO');
    this.name = 'ArchivoSobrepasaTamanioError';
  }
}

export class FormatoArchivoNoPermitidoError extends DomainError {
  constructor() {
    super('Formato no permitido. Use PDF, JPG o PNG', 'FORMATO_ARCHIVO_NO_PERMITIDO');
    this.name = 'FormatoArchivoNoPermitidoError';
  }
}
