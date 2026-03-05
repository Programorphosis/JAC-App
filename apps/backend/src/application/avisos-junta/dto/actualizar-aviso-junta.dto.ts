import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO para actualizar aviso de junta (parcial).
 */
export class ActualizarAvisoJuntaDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El título no puede estar vacío' })
  @MaxLength(200, { message: 'El título no puede exceder 200 caracteres' })
  titulo?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El contenido no puede estar vacío' })
  contenido?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
