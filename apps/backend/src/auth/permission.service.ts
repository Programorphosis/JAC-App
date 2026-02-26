/**
 * PermissionService – Centraliza lógica de autorización por recurso.
 * Referencia: permisos.md, MATRIZ_PERMISOS_ROLES.md
 *
 * Evita repetir fórmulas de puedeVerOtro, puedeConsultarOtro, etc. en controllers.
 */
import { Injectable } from '@nestjs/common';
import { RolNombre } from '@prisma/client';
import type { JwtUser } from './strategies/jwt.strategy';

@Injectable()
export class PermissionService {
  /**
   * true si puede consultar deuda/estado/documentos de otro usuario.
   * ADMIN, SECRETARIA, TESORERA, o modificador con junta.
   */
  puedeConsultarRecursoDeOtro(user: JwtUser): boolean {
    if (!user.juntaId) return false;
    if (
      user.roles.includes(RolNombre.ADMIN) ||
      user.roles.includes(RolNombre.SECRETARIA) ||
      user.roles.includes(RolNombre.TESORERA) ||
      user.roles.includes(RolNombre.FISCAL)
    ) {
      return true;
    }
    return user.esModificador === true;
  }

  /**
   * true si puede ver historial laboral de otro usuario.
   * ADMIN, SECRETARIA, TESORERA.
   */
  puedeVerHistorialDeOtro(user: JwtUser): boolean {
    return (
      user.roles.includes(RolNombre.ADMIN) ||
      user.roles.includes(RolNombre.SECRETARIA) ||
      user.roles.includes(RolNombre.TESORERA) ||
      user.roles.includes(RolNombre.FISCAL)
    );
  }

  /**
   * true si puede ver/listar cartas de otro usuario.
   * SECRETARIA y FISCAL.
   */
  puedeVerCartasDeOtro(user: JwtUser): boolean {
    return (
      user.roles.includes(RolNombre.SECRETARIA) ||
      user.roles.includes(RolNombre.FISCAL)
    );
  }

  /**
   * true si puede solicitar carta para otro usuario.
   * Solo SECRETARIA.
   */
  puedeSolicitarCartaParaOtro(user: JwtUser): boolean {
    return user.roles.includes(RolNombre.SECRETARIA);
  }

  /**
   * true si puede descargar documentos de otro usuario.
   * ADMIN, SECRETARIA, TESORERA.
   */
  puedeVerDocumentosDeOtro(user: JwtUser): boolean {
    return (
      user.roles.includes(RolNombre.ADMIN) ||
      user.roles.includes(RolNombre.SECRETARIA) ||
      user.roles.includes(RolNombre.TESORERA) ||
      user.roles.includes(RolNombre.FISCAL)
    );
  }

  /**
   * true si puede subir documento para otro usuario.
   * Solo TESORERA.
   */
  puedeSubirDocumentoParaOtro(user: JwtUser): boolean {
    return user.roles.includes(RolNombre.TESORERA);
  }

  /**
   * true si puede crear pago o intención de pago para otro usuario.
   * Solo TESORERA.
   */
  puedeCrearPagoParaOtro(user: JwtUser): boolean {
    return user.roles.includes(RolNombre.TESORERA);
  }

  /**
   * true si puede listar cartas pendientes (módulo Cartas).
   * SECRETARIA (validar/rechazar) y FISCAL (solo ver).
   */
  puedeListarCartasPendientes(user: JwtUser): boolean {
    return (
      user.roles.includes(RolNombre.SECRETARIA) ||
      user.roles.includes(RolNombre.FISCAL)
    );
  }
}
