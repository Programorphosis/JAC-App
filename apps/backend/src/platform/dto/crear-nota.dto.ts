import { IsString, MinLength } from 'class-validator';

export class CrearNotaDto {
  @IsString()
  @MinLength(1, { message: 'El contenido es requerido' })
  contenido: string;
}
