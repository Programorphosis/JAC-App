import { IsString, IsOptional, IsEnum, IsUUID, MinLength, MaxLength, ValidateIf } from 'class-validator';

export enum AlcanceAvisoDto {
  PLATAFORMA = 'PLATAFORMA',
  TODAS_JUNTAS = 'TODAS_JUNTAS',
  JUNTA_ESPECIFICA = 'JUNTA_ESPECIFICA',
}

export class CrearAvisoDto {
  @IsString()
  @MinLength(1, { message: 'El título es requerido' })
  @MaxLength(200)
  titulo: string;

  @IsString()
  @MinLength(1, { message: 'El contenido es requerido' })
  contenido: string;

  @IsOptional()
  @IsEnum(AlcanceAvisoDto, { message: 'Alcance debe ser PLATAFORMA, TODAS_JUNTAS o JUNTA_ESPECIFICA' })
  alcance?: AlcanceAvisoDto;

  @ValidateIf((o) => o.alcance === AlcanceAvisoDto.JUNTA_ESPECIFICA)
  @IsUUID('4', { message: 'Debe seleccionar una junta cuando el alcance es JUNTA_ESPECIFICA' })
  juntaId?: string;
}
