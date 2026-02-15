import { IsString, IsOptional, IsBoolean, IsUUID, ValidateIf } from 'class-validator';

export class UpdateRequisitoTipoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  modificadorId?: string | null;

  @IsOptional()
  @IsBoolean()
  tieneCorteAutomatico?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
