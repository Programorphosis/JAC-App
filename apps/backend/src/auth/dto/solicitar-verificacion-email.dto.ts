import { IsEmail } from 'class-validator';

export class SolicitarVerificacionEmailDto {
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  email!: string;
}
