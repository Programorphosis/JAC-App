import { IsString, IsOptional, IsIn } from 'class-validator';

/**
 * DTO para registrar pago efectivo o transferencia.
 * El monto NUNCA se envía: el backend lo calcula.
 */
export class RegistrarPagoEfectivoDto {
  @IsString()
  usuarioId!: string;

  @IsString()
  @IsIn(['EFECTIVO', 'TRANSFERENCIA'])
  metodo!: 'EFECTIVO' | 'TRANSFERENCIA';

  /** Requerido para TRANSFERENCIA: número o consecutivo de la transferencia (identificador único). */
  @IsOptional()
  @IsString()
  referenciaExterna?: string;
}
