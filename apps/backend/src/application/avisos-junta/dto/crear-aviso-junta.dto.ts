import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * DTO para crear aviso de junta (admin/secretaria → afiliados).
 * Independiente de AvisoPlataforma. Solo juntaId del JWT.
 */
export class CrearAvisoJuntaDto {
  @IsString()
  @MinLength(1, { message: 'El título es requerido' })
  @MaxLength(200, { message: 'El título no puede exceder 200 caracteres' })
  titulo!: string;

  @IsString()
  @MinLength(1, { message: 'El contenido es requerido' })
  contenido!: string;
}
