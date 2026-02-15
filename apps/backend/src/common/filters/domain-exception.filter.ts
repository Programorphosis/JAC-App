/**
 * Filtro global que captura errores de dominio y otros errores no controlados,
 * devolviendo mensajes útiles al cliente en lugar de "Internal Server Error".
 * Referencia: convencionesAPI.md
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../../domain/errors/domain.errors';

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as { message?: string | string[] })?.message as string;
      if (Array.isArray(message)) message = message.join('. ');
    } else if (exception instanceof DomainError) {
      status = this.mapDomainErrorToStatus(exception);
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.warn(`Error no controlado: ${exception.message}`, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message: message || 'Error desconocido',
      error: this.getErrorLabel(status),
    });
  }

  private mapDomainErrorToStatus(err: DomainError): number {
    const map: Record<string, number> = {
      DEUDA_CERO: HttpStatus.UNPROCESSABLE_ENTITY,
      PAGO_DUPLICADO: HttpStatus.CONFLICT,
      PAGO_CARTA_PENDIENTE: HttpStatus.UNPROCESSABLE_ENTITY,
      USUARIO_NO_ENCONTRADO: HttpStatus.NOT_FOUND,
      SIN_HISTORIAL_LABORAL: HttpStatus.UNPROCESSABLE_ENTITY,
      SIN_TARIFA_VIGENTE: HttpStatus.UNPROCESSABLE_ENTITY,
      HISTORIAL_SUPERPUESTO: HttpStatus.UNPROCESSABLE_ENTITY,
      REQUISITOS_CARTA_NO_CUMPLIDOS: HttpStatus.UNPROCESSABLE_ENTITY,
      CARTA_NO_PENDIENTE: HttpStatus.UNPROCESSABLE_ENTITY,
    };
    return map[err.code] ?? HttpStatus.UNPROCESSABLE_ENTITY;
  }

  private getErrorLabel(status: number): string {
    const labels: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
    };
    return labels[status] ?? 'Error';
  }
}
