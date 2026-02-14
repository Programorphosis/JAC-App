import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class CreateRequisitoTipoDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsUUID()
  modificadorId?: string;

  @IsOptional()
  @IsBoolean()
  tieneCorteAutomatico?: boolean;
}
