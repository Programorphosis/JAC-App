import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { RolNombre } from '@prisma/client';
import { JwtUser } from '../strategies/jwt.strategy';

/**
 * Guard que permite acceso si el usuario es ADMIN, SECRETARIA, TESORERA o modificador (esModificador).
 * Usado para listar/ver usuarios y estado-general de otros. TESORERA necesita listar usuarios para registrar pagos.
 */
@Injectable()
export class ModificadorOAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    const esAdminOSecretariaOTesorera =
      user.roles.includes(RolNombre.ADMIN) ||
      user.roles.includes(RolNombre.SECRETARIA) ||
      user.roles.includes(RolNombre.TESORERA);
    const esModificador = user.esModificador && user.juntaId;

    if (esAdminOSecretariaOTesorera || esModificador) {
      return true;
    }

    throw new ForbiddenException(
      'Se requiere rol ADMIN, SECRETARIA, TESORERA o ser modificador de un requisito',
    );
  }
}
