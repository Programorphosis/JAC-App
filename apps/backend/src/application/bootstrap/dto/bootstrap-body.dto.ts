export class BootstrapPlatformAdminDto {
  nombres!: string;
  apellidos!: string;
  tipoDocumento!: string;
  numeroDocumento!: string;
  password!: string;
}

export class BootstrapAdminUserDto {
  nombres!: string;
  apellidos!: string;
  tipoDocumento!: string;
  numeroDocumento!: string;
  telefono?: string;
  direccion?: string;
}

export class BootstrapPrimeraJuntaDto {
  nombre!: string;
  nit?: string;
  montoCarta?: number;
  adminUser!: BootstrapAdminUserDto;
}

export class BootstrapBodyDto {
  platformAdmin!: BootstrapPlatformAdminDto;
  primeraJunta!: BootstrapPrimeraJuntaDto;
}
