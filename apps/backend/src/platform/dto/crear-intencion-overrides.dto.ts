import { IsUUID, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para crear intención de pago de overrides.
 * Crea factura + intención; al confirmar pago se aplican los overrides.
 * PIVOT_FACTURACION_SAAS.md
 */
export class CrearIntencionOverridesDto {
  @IsUUID('4', { message: 'suscripcionId debe ser un UUID válido' })
  suscripcionId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  overrideLimiteUsuarios?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  overrideLimiteStorageMb?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  overrideLimiteCartasMes?: number | null;

  @IsOptional()
  motivoPersonalizacion?: string | null;
}
