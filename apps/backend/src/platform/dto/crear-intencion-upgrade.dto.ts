import { IsUUID, IsOptional, IsIn } from 'class-validator';

/**
 * DTO para crear intención de pago de upgrade (cambio a plan superior).
 * Crea factura + intención; al confirmar pago se actualiza la Suscripción.
 * PIVOT_FACTURACION_SAAS.md
 */
export class CrearIntencionUpgradeDto {
  @IsUUID('4', { message: 'suscripcionId debe ser un UUID válido' })
  suscripcionId: string;

  @IsUUID('4', { message: 'planId debe ser un UUID válido' })
  planId: string;

  @IsOptional()
  @IsIn(['mensual', 'anual'], { message: 'periodo debe ser mensual o anual' })
  periodo?: 'mensual' | 'anual';
}
