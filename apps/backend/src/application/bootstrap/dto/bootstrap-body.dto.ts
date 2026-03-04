import {
  IsString,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsEmail,
  Matches,
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
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^(\+?57)?[0-9]{10}$/, {
    message: 'El teléfono debe ser un número colombiano válido (10 dígitos)',
  })
  telefono!: string;

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
