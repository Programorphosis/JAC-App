import { IsString, IsEmail, IsOptional, MaxLength } from 'class-validator';

export class ActualizarDatosJuntaDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudad?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string | null;
}
