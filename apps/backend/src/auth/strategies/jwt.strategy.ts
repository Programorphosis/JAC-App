import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RolNombre } from '@prisma/client';

export interface JwtUser {
  id: string;
  juntaId: string | null;
  roles: RolNombre[];
}

interface JwtPayload {
  sub: string;
  juntaId: string | null;
  roles: RolNombre[];
  tipo?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    if (payload.tipo === 'refresh') {
      throw new UnauthorizedException('Use access token');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, juntaId: true, activo: true, roles: { include: { rol: true } } },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    return {
      id: usuario.id,
      juntaId: usuario.juntaId,
      roles: usuario.roles.map((ur) => ur.rol.nombre),
    };
  }
}
