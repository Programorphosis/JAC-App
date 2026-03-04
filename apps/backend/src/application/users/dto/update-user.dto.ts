import { IsString, IsOptional, IsBoolean, IsArray, IsIn, IsDateString, IsInt, Min, Matches, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  nombres?: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

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
  lugarExpedicion?: string | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(['ADMIN', 'SECRETARIA', 'TESORERA', 'RECEPTOR_AGUA', 'AFILIADO'], {
    each: true,
    message: 'Roles inválidos',
  })
  roles?: string[];

  /** Fecha de afiliación (libro físico). Para cartas. */
  @IsOptional()
  @IsDateString()
  fechaAfiliacion?: string | null;

  /** Folio del libro de afiliados. Para cartas. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  folio?: number | null;

  /** Numeral consecutivo del libro. Para cartas. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numeral?: number | null;
}
