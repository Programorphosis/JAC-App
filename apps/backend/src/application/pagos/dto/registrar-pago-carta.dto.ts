import { IsString, IsOptional, IsIn } from 'class-validator';

/**
 * DTO para registrar pago tipo CARTA (efectivo o transferencia).
 * El monto NUNCA se envía: el backend lo obtiene de Junta.montoCarta.
 */
export class RegistrarPagoCartaDto {
  @IsString()
  usuarioId!: string;

  @IsString()
  @IsIn(['EFECTIVO', 'TRANSFERENCIA'])
  metodo!: 'EFECTIVO' | 'TRANSFERENCIA';

  /** Requerido para TRANSFERENCIA: número o consecutivo de la transferencia. */
  @IsOptional()
  @IsString()
  referenciaExterna?: string;
}
