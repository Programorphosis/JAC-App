import { IsString, IsInt, IsOptional, IsBoolean, Min } from 'class-validator';

export class ActualizarPlanDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  precioMensual?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  precioAnual?: number;

  @IsOptional()
  limiteUsuarios?: number | null;

  @IsOptional()
  limiteStorageMb?: number | null;

  @IsOptional()
  limiteCartasMes?: number | null;

  @IsOptional()
  @IsBoolean()
  permiteUsuariosIlimitados?: boolean;

  @IsOptional()
  @IsBoolean()
  permiteStorageIlimitado?: boolean;

  @IsOptional()
  @IsBoolean()
  permiteCartasIlimitadas?: boolean;

  @IsOptional()
  @IsBoolean()
  esPersonalizable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  diasPrueba?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  /** Precios por demanda (solo si esPersonalizable). COP por unidad adicional. */
  @IsOptional()
  @IsInt()
  @Min(0)
  precioPorUsuarioAdicional?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  precioPorMbAdicional?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  precioPorCartaAdicional?: number | null;
}
