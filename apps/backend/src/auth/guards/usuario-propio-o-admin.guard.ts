import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { RolNombre } from '@prisma/client';
import { JwtUser } from '../strategies/jwt.strategy';

/**
 * Permite acceso si: ADMIN, SECRETARIA, TESORERA, modificador, O si solicita su propio usuario (id === user.id).
 * Usado para GET /usuarios/:id. TESORERA necesita ver detalles de usuarios para registrar pagos.
 */
@Injectable()
export class UsuarioPropioOAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtUser; params: Record<string, string> }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    const usuarioId = request.params['id'];
    if (usuarioId === user.id) {
      return true;
    }

    const esAdminOSecretariaOTesorera =
      user.roles.includes(RolNombre.ADMIN) ||
      user.roles.includes(RolNombre.SECRETARIA) ||
      user.roles.includes(RolNombre.TESORERA) ||
      user.roles.includes(RolNombre.FISCAL);
    const esModificador = user.esModificador && user.juntaId;

    if (esAdminOSecretariaOTesorera || esModificador) {
      return true;
    }

    throw new ForbiddenException(
      'Se requiere rol ADMIN, SECRETARIA, TESORERA o ser modificador para ver otros usuarios',
    );
  }
}
