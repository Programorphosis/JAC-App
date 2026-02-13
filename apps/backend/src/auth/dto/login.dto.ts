export class LoginDto {
  tipoDocumento!: string;
  numeroDocumento!: string;
  password!: string;
  juntaId?: string | null;
}
