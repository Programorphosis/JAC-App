import { IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  tipoDocumento!: string;

  @IsString()
  numeroDocumento!: string;

  @IsString()
  password!: string;

  @IsOptional()
  juntaId?: string | null;
}
