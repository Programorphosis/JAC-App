import { IsString, IsOptional, IsBoolean, IsArray, IsIn, IsDateString, IsInt, Min } from 'class-validator';
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
