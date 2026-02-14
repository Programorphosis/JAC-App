import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class UpdateRequisitoTipoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsUUID()
  modificadorId?: string;

  @IsOptional()
  @IsBoolean()
  tieneCorteAutomatico?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
