import { IsString, IsInt, IsOptional, IsBoolean, Min } from 'class-validator';

export class CrearPlanDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsInt()
  @Min(0)
  precioMensual!: number;

  @IsInt()
  @Min(0)
  precioAnual!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  limiteUsuarios?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  limiteStorageMb?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
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
