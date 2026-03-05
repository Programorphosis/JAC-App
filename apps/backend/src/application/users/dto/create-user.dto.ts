import {
  IsString,
  IsOptional,
  IsArray,
  IsIn,
  MinLength,
  IsDateString,
  IsInt,
  Min,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  tipoDocumento!: string;

  @IsString()
  numeroDocumento!: string;

  @IsString()
  nombres!: string;

  @IsString()
  apellidos!: string;

  @IsOptional()
  @IsString()
  @ValidateIf((_, v) => v != null && v !== '')
  @Matches(/^(\+?57)?[0-9]{10}$/, {
    message: 'El teléfono debe ser un número colombiano válido (10 dígitos)',
  })
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  lugarExpedicion?: string;

  /** Si no se envía, se usa numeroDocumento como contraseña inicial (usuario debe cambiarla en primer login). */
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(['ADMIN', 'SECRETARIA', 'TESORERA', 'RECEPTOR_AGUA', 'AFILIADO'], {
    each: true,
    message: 'Roles inválidos',
  })
  roles?: string[];

  /** Estado laboral inicial al registrar. Por defecto NO_TRABAJANDO. */
  @IsOptional()
  @IsString()
  @IsIn(['TRABAJANDO', 'NO_TRABAJANDO'], {
    message: 'estadoLaboralInicial debe ser TRABAJANDO o NO_TRABAJANDO',
  })
  estadoLaboralInicial?: 'TRABAJANDO' | 'NO_TRABAJANDO';

  /** Fecha de afiliación (libro físico). Para cartas. */
  @IsOptional()
  @IsDateString()
  fechaAfiliacion?: string;

  /** Folio del libro de afiliados. Para cartas. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  folio?: number;

  /** Numeral consecutivo del libro. Para cartas. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numeral?: number;
}
