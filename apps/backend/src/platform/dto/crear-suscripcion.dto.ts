import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CrearSuscripcionDto {
  @IsString()
  planId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  diasPrueba?: number;
}
