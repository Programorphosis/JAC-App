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
