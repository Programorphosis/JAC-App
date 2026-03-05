import { IsString, IsOptional, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const PERIODOS_VALIDOS = ['mensual', 'anual'] as const;

export class CrearSuscripcionDto {
  @IsString()
  planId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  diasPrueba?: number;

  @IsOptional()
  @IsIn(PERIODOS_VALIDOS)
  periodo?: (typeof PERIODOS_VALIDOS)[number];
}
