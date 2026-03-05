import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';

const ESTADOS_VALIDOS = [
  'ACTIVA',
  'SUSPENDIDA',
  'CANCELADA',
  'PRUEBA',
  'VENCIDA',
] as const;
const PERIODOS_VALIDOS = ['mensual', 'anual'] as const;

export class ActualizarSuscripcionDto {
  @IsOptional()
  @IsString()
  planId?: string;

  /** Solo platform admin. Omite validación día de corte para downgrade (casos excepcionales). */
  @IsOptional()
  @IsBoolean()
  forzarDowngrade?: boolean;

  /** Facturación mensual o anual. Solo aplica al cambiar plan (upgrade). Si se envía, calcula fechaVencimiento. */
  @IsOptional()
  @IsIn(PERIODOS_VALIDOS)
  periodo?: (typeof PERIODOS_VALIDOS)[number];

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @IsOptional()
  @IsIn(ESTADOS_VALIDOS)
  estado?: (typeof ESTADOS_VALIDOS)[number];

  /** Overrides: solo si plan.esPersonalizable. Aumento de capacidad por demanda. */
  @IsOptional()
  @IsInt()
  @Min(0)
  overrideLimiteUsuarios?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  overrideLimiteStorageMb?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  overrideLimiteCartasMes?: number | null;

  @IsOptional()
  @IsString()
  motivoPersonalizacion?: string | null;
}
