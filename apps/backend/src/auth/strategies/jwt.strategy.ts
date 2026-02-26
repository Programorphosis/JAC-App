import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RolNombre } from '@prisma/client';

export interface JwtUser {
  id: string;
  juntaId: string | null;
  roles: RolNombre[];
  esModificador: boolean;
  requisitoTipoIds: string[];
  /** PA-8: true cuando platform admin está viendo como junta (solo lectura). */
  impersonando?: boolean;
}

interface JwtPayload {
  sub: string;
  juntaId: string | null;
  roles: RolNombre[];
  tipo?: string;
  impersonando?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    if (payload.tipo === 'refresh') {
      throw new UnauthorizedException('Use access token');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        juntaId: true,
        activo: true,
        roles: { include: { rol: true } },
        requisitosComoModificador: { select: { id: true } },
      },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    const requisitoTipoIds = usuario.requisitosComoModificador?.map((r) => r.id) ?? [];
    const esModificador = requisitoTipoIds.length > 0;

    // PA-8: En impersonación, usar juntaId del payload (junta vista) en lugar del usuario
    const juntaId =
      payload.impersonando && payload.juntaId ? payload.juntaId : usuario.juntaId;

    return {
      id: usuario.id,
      juntaId,
      roles: usuario.roles.map((ur) => ur.rol.nombre),
      esModificador,
      requisitoTipoIds,
      impersonando: payload.impersonando === true,
    };
  }
}
