import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../domain/services/audit.service';
import * as bcrypt from 'bcrypt';
import { RolNombre } from '@prisma/client';
import {
  computePermissions,
  computePermissionsForImpersonation,
} from './permissions-from-roles';
import type { Permission } from './permissions.constants';

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
  /** PA-8: true cuando platform admin está viendo como junta (solo lectura). */
  impersonando?: boolean;
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
    permissions: Permission[];
    esModificador: boolean;
    requisitoTipoIds: string[];
    /** PA-8: true cuando está en modo impersonación. */
    impersonando?: boolean;
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
      include: {
        roles: { include: { rol: true } },
        requisitosComoModificador: { select: { id: true } },
        junta: { select: { activo: true, enMantenimiento: true } },
      },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (usuario.juntaId && usuario.junta) {
      if (!usuario.junta.activo) {
        throw new UnauthorizedException('La junta no está activa');
      }
      if (usuario.junta.enMantenimiento) {
        throw new UnauthorizedException('La junta está en mantenimiento. Intente más tarde.');
      }
    }

    const ok = await bcrypt.compare(dto.password, usuario.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const roles = usuario.roles.map((ur) => ur.rol.nombre);
    const esModificador = (usuario.requisitosComoModificador?.length ?? 0) > 0;
    const permissions = computePermissions(
      roles,
      esModificador,
      usuario.juntaId,
    );

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
        permissions,
        esModificador,
        requisitoTipoIds: usuario.requisitosComoModificador?.map((r) => r.id) ?? [],
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
        junta: { select: { id: true, nombre: true } },
        roles: { include: { rol: { select: { nombre: true } } } },
        requisitosComoModificador: { select: { id: true } },
      },
    });

    const requisitoTipoIds = usuario.requisitosComoModificador?.map((r) => r.id) ?? [];
    const esModificador = requisitoTipoIds.length > 0;

    return {
      ...usuario,
      junta: usuario.junta,
      roles: usuario.roles.map((ur) => ur.rol.nombre),
      esModificador,
      requisitoTipoIds,
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
        include: {
          roles: { include: { rol: true } },
          requisitosComoModificador: { select: { id: true } },
        },
      });

      if (!usuario.activo) {
        throw new UnauthorizedException('Usuario inactivo');
      }

      const roles = usuario.roles.map((ur) => ur.rol.nombre);
      const requisitoTipoIds = usuario.requisitosComoModificador?.map((r) => r.id) ?? [];
      const esModificador = requisitoTipoIds.length > 0;

      // PA-8: Preservar impersonación en refresh
      const impersonando = payload.impersonando === true && payload.juntaId;
      const juntaId = impersonando ? payload.juntaId : usuario.juntaId;
      const permissions = impersonando
        ? computePermissionsForImpersonation()
        : computePermissions(roles, esModificador, usuario.juntaId);

      const newPayload: JwtPayload = {
        sub: usuario.id,
        juntaId,
        roles,
        tipo: 'access',
        ...(impersonando && { impersonando: true }),
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
          juntaId,
          roles,
          permissions,
          esModificador,
          requisitoTipoIds,
          ...(impersonando && { impersonando: true }),
        },
      };
    } catch {
      throw new UnauthorizedException('Token de refresco inválido');
    }
  }

  /**
   * PA-8: Genera tokens de impersonación para que un platform admin vea la app como junta (solo lectura).
   */
  async impersonar(platformAdminId: string, juntaId: string): Promise<AuthResult> {
    const [usuario, junta] = await Promise.all([
      this.prisma.usuario.findUniqueOrThrow({
        where: { id: platformAdminId },
        include: { roles: { include: { rol: true } } },
      }),
      this.prisma.junta.findUnique({ where: { id: juntaId } }),
    ]);

    if (!usuario.activo || usuario.juntaId !== null) {
      throw new UnauthorizedException('Solo platform admin puede impersonar');
    }
    const roles = usuario.roles.map((ur) => ur.rol.nombre);
    if (!roles.includes(RolNombre.PLATFORM_ADMIN)) {
      throw new UnauthorizedException('Se requiere rol PLATFORM_ADMIN');
    }
    if (!junta) {
      throw new UnauthorizedException('Junta no encontrada');
    }

    const permissions = computePermissionsForImpersonation();
    const payload: JwtPayload = {
      sub: usuario.id,
      juntaId,
      roles,
      tipo: 'access',
      impersonando: true,
    };
    const refreshPayload: JwtPayload = {
      ...payload,
      tipo: 'refresh',
    };

    const expiresIn = 900;
    const accessToken = this.jwtService.sign(payload, { expiresIn: `${expiresIn}s` });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: 604800,
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Auth',
      entidadId: usuario.id,
      accion: 'IMPERSONACION_INICIO',
      metadata: { platformAdminId, juntaNombre: junta.nombre },
      ejecutadoPorId: platformAdminId,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: usuario.id,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        numeroDocumento: usuario.numeroDocumento,
        juntaId,
        roles,
        permissions,
        esModificador: false,
        requisitoTipoIds: [],
        impersonando: true,
      },
    };
  }

  /**
   * PA-8: Restaura tokens normales de platform admin tras salir de impersonación.
   * @param juntaIdImpersonada - junta que se estaba viendo (para auditoría)
   */
  async salirImpersonacion(
    platformAdminId: string,
    juntaIdImpersonada: string,
  ): Promise<AuthResult> {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: platformAdminId },
      include: {
        roles: { include: { rol: true } },
        requisitosComoModificador: { select: { id: true } },
      },
    });

    if (!usuario.activo || usuario.juntaId !== null) {
      throw new UnauthorizedException('Usuario no es platform admin');
    }

    const roles = usuario.roles.map((ur) => ur.rol.nombre);
    const esModificador = (usuario.requisitosComoModificador?.length ?? 0) > 0;
    const permissions = computePermissions(roles, esModificador, null);

    const payload: JwtPayload = {
      sub: usuario.id,
      juntaId: null,
      roles,
      tipo: 'access',
    };
    const refreshPayload: JwtPayload = { ...payload, tipo: 'refresh' };

    const expiresIn = 900;
    const accessToken = this.jwtService.sign(payload, { expiresIn: `${expiresIn}s` });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: 604800,
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    });

    await this.audit.registerEvent({
      juntaId: juntaIdImpersonada,
      entidad: 'Auth',
      entidadId: platformAdminId,
      accion: 'IMPERSONACION_FIN',
      metadata: { platformAdminId },
      ejecutadoPorId: platformAdminId,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: usuario.id,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        numeroDocumento: usuario.numeroDocumento,
        juntaId: null,
        roles,
        permissions,
        esModificador,
        requisitoTipoIds: usuario.requisitosComoModificador?.map((r) => r.id) ?? [],
      },
    };
  }
}
