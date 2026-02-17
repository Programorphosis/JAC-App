import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ActualizarJuntaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  nit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  montoCarta?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudad?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enMantenimiento?: boolean;
}
