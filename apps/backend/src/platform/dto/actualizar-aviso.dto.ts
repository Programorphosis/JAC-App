import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AlcanceAvisoDto } from './crear-aviso.dto';

export { AlcanceAvisoDto } from './crear-aviso.dto';

export class ActualizarAvisoDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El título no puede estar vacío' })
  @MaxLength(200)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El contenido no puede estar vacío' })
  contenido?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsEnum(AlcanceAvisoDto, {
    message: 'Alcance debe ser PLATAFORMA, TODAS_JUNTAS o JUNTA_ESPECIFICA',
  })
  alcance?: AlcanceAvisoDto;

  @ValidateIf(
    (o: { alcance?: AlcanceAvisoDto }) =>
      o.alcance === AlcanceAvisoDto.JUNTA_ESPECIFICA,
  )
  @IsUUID('4', {
    message: 'Debe seleccionar una junta cuando el alcance es JUNTA_ESPECIFICA',
  })
  juntaId?: string | null;

  /** true = solo operativos. Solo aplica si alcance es TODAS_JUNTAS o JUNTA_ESPECIFICA. */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  soloOperativos?: boolean;
}
