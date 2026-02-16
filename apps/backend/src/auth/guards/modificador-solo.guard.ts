import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtUser } from '../strategies/jwt.strategy';

/**
 * Guard que permite acceso solo si el usuario es modificador de al menos un requisito.
 * Usado para POST requisitos/:requisitoTipoId/estado (cambiar AL_DÍA/MORA).
 * El servicio valida que sea el modificador del requisito específico.
 */
@Injectable()
export class ModificadorSoloGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    if (user.esModificador && user.juntaId) {
      return true;
    }

    throw new ForbiddenException(
      'Solo el modificador asignado al requisito puede actualizar el estado',
    );
  }
}
