import { IsString, IsOptional, IsInt, Min, IsIn } from 'class-validator';

const PERIODOS_VALIDOS = ['mensual', 'anual'] as const;

export class CrearSuscripcionMiJuntaDto {
  @IsString()
  planId!: string;

  /** Días de prueba (usa plan.diasPrueba si no se envía). */
  @IsOptional()
  @IsInt()
  @Min(0)
  diasPrueba?: number;

  /** Facturación mensual o anual. Default: anual. */
  @IsOptional()
  @IsIn(PERIODOS_VALIDOS)
  periodo?: (typeof PERIODOS_VALIDOS)[number];
}
