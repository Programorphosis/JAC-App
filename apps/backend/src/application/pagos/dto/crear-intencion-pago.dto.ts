import { IsString } from 'class-validator';

/**
 * DTO para crear intención de pago online.
 * Solo usuarioId: el backend calcula deuda y crea el link en Wompi.
 */
export class CrearIntencionPagoDto {
  @IsString()
  usuarioId!: string;
}
