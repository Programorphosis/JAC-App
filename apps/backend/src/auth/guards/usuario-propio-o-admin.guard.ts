import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { RolNombre } from '@prisma/client';
import { JwtUser } from '../strategies/jwt.strategy';

/**
 * Permite acceso si: ADMIN, SECRETARIA, modificador, O si solicita su propio usuario (id === user.id).
 * Usado para GET /usuarios/:id para que CIUDADANO pueda ver su "Mi cuenta".
 */
@Injectable()
export class UsuarioPropioOAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    const usuarioId = request.params['id'];
    if (usuarioId === user.id) {
      return true;
    }

    const esAdminOSecretaria =
      user.roles.includes(RolNombre.ADMIN) || user.roles.includes(RolNombre.SECRETARIA);
    const esModificador = user.esModificador && user.juntaId;

    if (esAdminOSecretaria || esModificador) {
      return true;
    }

    throw new ForbiddenException('No tiene permiso para ver este usuario');
  }
}

