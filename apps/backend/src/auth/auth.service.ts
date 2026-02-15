import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../domain/services/audit.service';
import * as bcrypt from 'bcrypt';
import { RolNombre } from '@prisma/client';

export interface LoginInput {
  tipoDocumento: string;
  numeroDocumento: string;
  password: string;
  juntaId?: string | null;
}

export interface JwtPayload {
  sub: string;
  juntaId: string | null;
  roles: RolNombre[];
  tipo: 'access' | 'refresh';
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    nombres: string;
    apellidos: string;
    numeroDocumento: string;
    juntaId: string | null;
    roles: RolNombre[];
    esModificador: boolean;
    requisitoTipoId: string | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginInput): Promise<AuthResult> {
    const where: { tipoDocumento: string; numeroDocumento: string; juntaId?: string | null } = {
      tipoDocumento: dto.tipoDocumento,
      numeroDocumento: dto.numeroDocumento,
    };

    if (dto.juntaId !== undefined) {
      where.juntaId = dto.juntaId === null || dto.juntaId === 'platform' ? null : dto.juntaId;
    }

    const usuario = await this.prisma.usuario.findFirst({
      where,
      include: { roles: { include: { rol: true } } },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const ok = await bcrypt.compare(dto.password, usuario.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const roles = usuario.roles.map((ur) => ur.rol.nombre);

    const payload: JwtPayload = {
      sub: usuario.id,
      juntaId: usuario.juntaId,
      roles,
      tipo: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: usuario.id,
      juntaId: usuario.juntaId,
      roles,
      tipo: 'refresh',
    };

    const expiresIn = 900; // 15 min en segundos
    const accessToken = this.jwtService.sign(payload, { expiresIn: `${expiresIn}s` });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: 604800, // 7 días en segundos
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    });

    if (usuario.juntaId) {
      await this.audit.registerEvent({
        juntaId: usuario.juntaId,
        entidad: 'Auth',
        entidadId: usuario.id,
        accion: 'LOGIN_EXITOSO',
        metadata: { numeroDocumento: usuario.numeroDocumento },
        ejecutadoPorId: usuario.id,
      });
    }

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: usuario.id,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        numeroDocumento: usuario.numeroDocumento,
        juntaId: usuario.juntaId,
        roles,
        esModificador: usuario.esModificador ?? false,
        requisitoTipoId: usuario.requisitoTipoId ?? null,
      },
    };
  }

  async getProfile(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
      select: {
        id: true,
        tipoDocumento: true,
        numeroDocumento: true,
        nombres: true,
        apellidos: true,
        telefono: true,
        direccion: true,
        juntaId: true,
        activo: true,
        fechaCreacion: true,
        esModificador: true,
        requisitoTipoId: true,
        junta: { select: { id: true, nombre: true } },
        roles: { include: { rol: { select: { nombre: true } } } },
      },
    });

    return {
      ...usuario,
      junta: usuario.junta,
      roles: usuario.roles.map((ur) => ur.rol.nombre),
      esModificador: usuario.esModificador ?? false,
      requisitoTipoId: usuario.requisitoTipoId ?? null,
    };
  }

  async validateRefreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      });

      if (payload.tipo !== 'refresh') {
        throw new UnauthorizedException('Token inválido');
      }

      const usuario = await this.prisma.usuario.findUniqueOrThrow({
        where: { id: payload.sub },
        include: { roles: { include: { rol: true } } },
      });

      if (!usuario.activo) {
        throw new UnauthorizedException('Usuario inactivo');
      }

      const roles = usuario.roles.map((ur) => ur.rol.nombre);

      const newPayload: JwtPayload = {
        sub: usuario.id,
        juntaId: usuario.juntaId,
        roles,
        tipo: 'access',
      };

      const expiresIn = 900;
      const accessToken = this.jwtService.sign(newPayload, { expiresIn: `${expiresIn}s` });
      const newRefreshToken = this.jwtService.sign(
        { ...newPayload, tipo: 'refresh' } as JwtPayload,
        {
          expiresIn: 604800,
          secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        },
      );

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn,
        user: {
          id: usuario.id,
          nombres: usuario.nombres,
          apellidos: usuario.apellidos,
          numeroDocumento: usuario.numeroDocumento,
          juntaId: usuario.juntaId,
          roles,
          esModificador: usuario.esModificador ?? false,
          requisitoTipoId: usuario.requisitoTipoId ?? null,
        },
      };
    } catch {
      throw new UnauthorizedException('Token de refresco inválido');
    }
  }
}
