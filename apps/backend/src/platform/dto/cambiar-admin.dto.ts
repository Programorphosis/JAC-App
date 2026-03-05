import { IsString, IsUUID } from 'class-validator';

export class CambiarAdminDto {
  @IsString()
  @IsUUID('4', { message: 'nuevoAdminUsuarioId debe ser un UUID válido' })
  nuevoAdminUsuarioId!: string;
}
