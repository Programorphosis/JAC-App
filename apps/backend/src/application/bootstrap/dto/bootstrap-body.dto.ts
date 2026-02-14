import {
  IsString,
  IsOptional,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BootstrapPlatformAdminDto {
  @IsString()
  nombres!: string;

  @IsString()
  apellidos!: string;

  @IsString()
  tipoDocumento!: string;

  @IsString()
  numeroDocumento!: string;

  @IsString()
  password!: string;
}

export class BootstrapAdminUserDto {
  @IsString()
  nombres!: string;

  @IsString()
  apellidos!: string;

  @IsString()
  tipoDocumento!: string;

  @IsString()
  numeroDocumento!: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  direccion?: string;
}

export class BootstrapPrimeraJuntaDto {
  @IsString()
  nombre!: string;

  @IsString()
  @IsOptional()
  nit?: string;

  @IsNumber()
  @IsOptional()
  montoCarta?: number;

  @ValidateNested()
  @Type(() => BootstrapAdminUserDto)
  adminUser!: BootstrapAdminUserDto;
}

export class BootstrapBodyDto {
  @ValidateNested()
  @Type(() => BootstrapPlatformAdminDto)
  platformAdmin!: BootstrapPlatformAdminDto;

  @ValidateNested()
  @Type(() => BootstrapPrimeraJuntaDto)
  primeraJunta!: BootstrapPrimeraJuntaDto;
}
