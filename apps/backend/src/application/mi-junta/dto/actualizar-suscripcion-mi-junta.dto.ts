import { IsString, IsOptional, IsInt, Min, IsIn } from 'class-validator';

const PERIODOS_VALIDOS = ['mensual', 'anual'] as const;

/** Solo permite cambiar plan y overrides. No permite fechaVencimiento ni estado (platform admin). */
export class ActualizarSuscripcionMiJuntaDto {
  @IsOptional()
  @IsString()
  planId?: string;

  /** Facturación mensual o anual. Solo aplica al cambiar plan (upgrade). Default: anual. */
  @IsOptional()
  @IsIn(PERIODOS_VALIDOS)
  periodo?: (typeof PERIODOS_VALIDOS)[number];

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
