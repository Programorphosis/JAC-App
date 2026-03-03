import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../domain/services/audit.service';
import { EmailService } from '../infrastructure/email/email.service';
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
    /** true = debe cambiar contraseña en primer login (y registrar email). */
    requiereCambioPassword: boolean;
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
    private readonly email: EmailService,
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
      // Registrar intento fallido sin revelar si el usuario existe (prevenir enumeración)
      await this.registrarLoginFallido(dto.juntaId ?? null, dto.numeroDocumento, 'CREDENCIALES_INVALIDAS');
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (usuario.juntaId && usuario.junta) {
      if (!usuario.junta.activo) {
        await this.registrarLoginFallido(usuario.juntaId, usuario.numeroDocumento, 'JUNTA_INACTIVA');
        throw new UnauthorizedException('La junta no está activa');
      }
      if (usuario.junta.enMantenimiento) {
        await this.registrarLoginFallido(usuario.juntaId, usuario.numeroDocumento, 'JUNTA_EN_MANTENIMIENTO');
        throw new UnauthorizedException('La junta está en mantenimiento. Intente más tarde.');
      }
    }

    const ok = await bcrypt.compare(dto.password, usuario.passwordHash);
    if (!ok) {
      await this.registrarLoginFallido(usuario.juntaId, usuario.numeroDocumento, 'PASSWORD_INCORRECTO');
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
        requiereCambioPassword: usuario.requiereCambioPassword,
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
        email: true,
        juntaId: true,
        activo: true,
        requiereCambioPassword: true,
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
          requiereCambioPassword: usuario.requiereCambioPassword,
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
        requiereCambioPassword: false,
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
        requiereCambioPassword: usuario.requiereCambioPassword,
      },
    };
  }

  /**
   * Cambia la contraseña del usuario autenticado.
   * Si requiereCambioPassword=true, email es obligatorio (se guarda para futuras recuperaciones).
   */
  async cambiarPassword(
    usuarioId: string,
    dto: { passwordActual: string; passwordNueva: string; email?: string },
  ): Promise<{ requiereCambioPassword: boolean }> {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
    });

    const ok = await bcrypt.compare(dto.passwordActual, usuario.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    if (usuario.requiereCambioPassword && !dto.email?.trim()) {
      throw new BadRequestException(
        'Al cambiar la contraseña por primera vez debes indicar un correo electrónico para futuras recuperaciones.',
      );
    }

    const emailRaw = dto.email?.trim();
    const email = emailRaw ? emailRaw.toLowerCase() : null;
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new BadRequestException('El correo electrónico no es válido');
      }
    }

    const passwordHash = await bcrypt.hash(dto.passwordNueva, 10);

    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        passwordHash,
        requiereCambioPassword: false,
        ...(email && { email }),
      },
    });

    if (usuario.juntaId) {
      await this.audit.registerEvent({
        juntaId: usuario.juntaId,
        entidad: 'Auth',
        entidadId: usuarioId,
        accion: 'CAMBIO_PASSWORD',
        metadata: { conEmail: !!email },
        ejecutadoPorId: usuarioId,
      });
    }

    return { requiereCambioPassword: false };
  }

  /**
   * Solicita código de recuperación. Envía email con código de 6 dígitos.
   * No revela si el email existe (seguridad).
   */
  async solicitarCodigoRecuperacion(dto: { email: string }): Promise<{ enviado: boolean }> {
    const emailNorm = dto.email.trim().toLowerCase();
    const usuario = await this.prisma.usuario.findFirst({
      where: { email: emailNorm, activo: true },
    });

    if (!usuario) {
      // No revelar que el email no existe (evitar enumeración)
      return { enviado: true };
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEn = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await this.prisma.codigoRecuperacion.create({
      data: {
        usuarioId: usuario.id,
        codigo,
        expiraEn,
      },
    });

    const nombreUsuario = `${usuario.nombres} ${usuario.apellidos}`.trim() || usuario.numeroDocumento;
    await this.email.enviarCodigoRecuperacion({
      to: usuario.email!,
      codigo,
      nombreUsuario,
    });

    return { enviado: true };
  }

  /**
   * Verifica código y actualiza contraseña. Invalida el código tras uso.
   */
  async verificarCodigoYRecuperar(dto: {
    email: string;
    codigo: string;
    passwordNueva: string;
  }): Promise<void> {
    const emailNorm = dto.email.trim().toLowerCase();
    const usuario = await this.prisma.usuario.findFirst({
      where: { email: emailNorm, activo: true },
    });

    if (!usuario) {
      throw new NotFoundException('Código inválido o expirado');
    }

    const codigoRec = await this.prisma.codigoRecuperacion.findFirst({
      where: {
        usuarioId: usuario.id,
        codigo: dto.codigo.trim(),
        usado: false,
        expiraEn: { gt: new Date() },
      },
      orderBy: { fechaCreacion: 'desc' },
    });

    if (!codigoRec) {
      throw new BadRequestException('Código inválido o expirado');
    }

    const passwordHash = await bcrypt.hash(dto.passwordNueva, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: usuario.id },
        data: { passwordHash, requiereCambioPassword: false },
      });
      await tx.codigoRecuperacion.update({
        where: { id: codigoRec.id },
        data: { usado: true },
      });
    });

    if (usuario.juntaId) {
      await this.audit.registerEvent({
        juntaId: usuario.juntaId,
        entidad: 'Auth',
        entidadId: usuario.id,
        accion: 'RECUPERACION_PASSWORD',
        metadata: {},
        ejecutadoPorId: usuario.id,
      });
    }
  }

  /**
   * Registra intento de login fallido en auditoría.
   * No expone si el usuario existe o no (previene enumeración de cuentas).
   * juntaId puede ser null para Platform Admin o cuando la junta no se identifica.
   */
  private async registrarLoginFallido(
    juntaId: string | null,
    numeroDocumento: string,
    motivo: string,
  ): Promise<void> {
    try {
      // Para login fallido usamos juntaId='sistema' si no hay junta (Platform Admin o junta no encontrada)
      // Solo registramos en Auditoria si tenemos juntaId válido; si no, el log queda en console.warn
      if (juntaId) {
        await this.audit.registerEvent({
          juntaId,
          entidad: 'Auth',
          entidadId: `login:${numeroDocumento}`,
          accion: 'LOGIN_FALLIDO',
          metadata: { motivo },
          ejecutadoPorId: 'sistema',
        });
      }
      // Para logins sin junta identificable, solo logueamos sin guardar en BD (no hay juntaId)
    } catch {
      // No propagamos errores de auditoría en login fallido
    }
  }
}
