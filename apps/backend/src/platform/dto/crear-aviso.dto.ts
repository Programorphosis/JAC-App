import { IsString, IsOptional, IsEnum, IsUUID, IsBoolean, MinLength, MaxLength, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export enum AlcanceAvisoDto {
  PLATAFORMA = 'PLATAFORMA',
  TODAS_JUNTAS = 'TODAS_JUNTAS',
  JUNTA_ESPECIFICA = 'JUNTA_ESPECIFICA',
}

export class CrearAvisoDto {
  @IsString()
  @MinLength(1, { message: 'El título es requerido' })
  @MaxLength(200)
  titulo!: string;

  @IsString()
  @MinLength(1, { message: 'El contenido es requerido' })
  contenido!: string;

  @IsOptional()
  @IsEnum(AlcanceAvisoDto, { message: 'Alcance debe ser PLATAFORMA, TODAS_JUNTAS o JUNTA_ESPECIFICA' })
  alcance?: AlcanceAvisoDto;

  @ValidateIf((o) => o.alcance === AlcanceAvisoDto.JUNTA_ESPECIFICA)
  @IsUUID('4', { message: 'Debe seleccionar una junta cuando el alcance es JUNTA_ESPECIFICA' })
  juntaId?: string;

  /** true = solo operativos (admin, secretaria, tesorera, fiscal, receptor_agua). Solo aplica si alcance es TODAS_JUNTAS o JUNTA_ESPECIFICA. */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  soloOperativos?: boolean;
}
