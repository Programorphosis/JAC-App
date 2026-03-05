import { IsUUID, IsOptional, IsIn, IsInt, Min } from 'class-validator';

/**
 * DTO para crear intención de pago de suscripción (plan sin trial).
 * Crea factura + intención; al confirmar pago se crea la Suscripción.
 * PIVOT_FACTURACION_SAAS.md
 */
export class CrearIntencionSuscripcionDto {
  @IsUUID('4', { message: 'planId debe ser un UUID válido' })
  planId!: string;

  @IsOptional()
  @IsIn(['mensual', 'anual'], { message: 'periodo debe ser mensual o anual' })
  periodo?: 'mensual' | 'anual';

  @IsOptional()
  @IsInt()
  @Min(0)
  diasPrueba?: number;
}
