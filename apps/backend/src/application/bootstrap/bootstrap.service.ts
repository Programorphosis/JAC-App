import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JuntaService } from '../junta/junta.service';
import * as bcrypt from 'bcrypt';
import { RolNombre } from '@prisma/client';
import { randomBytes } from 'crypto';
import { BootstrapYaEjecutadoError } from '../../domain/errors';

export interface BootstrapPlatformAdmin {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  password: string;
}

export interface BootstrapAdminUser {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono?: string;
  direccion?: string;
}

export interface BootstrapBody {
  platformAdmin: BootstrapPlatformAdmin;
  primeraJunta: {
    nombre: string;
    nit?: string;
    montoCarta?: number;
    adminUser: BootstrapAdminUser;
  };
}

export interface BootstrapResult {
  platformAdmin: {
    numeroDocumento: string;
    password: string;
    mensaje: string;
  };
  primeraJunta: {
    nombre: string;
    adminUsuario: {
      nombres: string;
      apellidos: string;
      numeroDocumento: string;
      passwordTemporal: string;
    };
    mensaje: string;
  };
}

function generarPasswordTemporal(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(12);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}

/**
 * BootstrapService - Inicialización única del sistema.
 * Crea platform admin + primera junta. Solo si count(juntas) === 0.
 * Referencia: flujoBootstrapYOnboarding.md §3
 */
@Injectable()
export class BootstrapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly juntaService: JuntaService,
  ) {}

  async puedeEjecutarBootstrap(): Promise<boolean> {
    const count = await this.prisma.junta.count();
    return count === 0;
  }

  async ejecutarBootstrap(body: BootstrapBody): Promise<BootstrapResult> {
    const puede = await this.puedeEjecutarBootstrap();
    if (!puede) {
      throw new BootstrapYaEjecutadoError();
    }

    const rolPlatformAdmin = await this.prisma.rol.findUniqueOrThrow({
      where: { nombre: RolNombre.PLATFORM_ADMIN },
    });

    const passwordHashPlatform = await bcrypt.hash(body.platformAdmin.password, 10);
    const passwordTemporalJunta = generarPasswordTemporal();

    const platformAdmin = await this.prisma.usuario.create({
      data: {
        juntaId: null,
        tipoDocumento: body.platformAdmin.tipoDocumento,
        numeroDocumento: body.platformAdmin.numeroDocumento,
        nombres: body.platformAdmin.nombres,
        apellidos: body.platformAdmin.apellidos,
        passwordHash: passwordHashPlatform,
      },
    });

    await this.prisma.usuarioRol.create({
      data: {
        usuarioId: platformAdmin.id,
        rolId: rolPlatformAdmin.id,
      },
    });

    const juntaResult = await this.juntaService.createJunta({
      nombre: body.primeraJunta.nombre,
      nit: body.primeraJunta.nit,
      montoCarta: body.primeraJunta.montoCarta,
      adminUser: body.primeraJunta.adminUser,
      passwordTemporal: passwordTemporalJunta,
      ejecutadoPorId: platformAdmin.id,
    });

    return {
      platformAdmin: {
        numeroDocumento: body.platformAdmin.numeroDocumento,
        password: body.platformAdmin.password,
        mensaje: 'Credenciales del Platform Admin. Guárdelas de forma segura.',
      },
      primeraJunta: {
        nombre: juntaResult.junta.nombre,
        adminUsuario: {
          nombres: juntaResult.adminUsuario.nombres,
          apellidos: juntaResult.adminUsuario.apellidos,
          numeroDocumento: juntaResult.adminUsuario.numeroDocumento,
          passwordTemporal: juntaResult.passwordTemporal,
        },
        mensaje: 'Entregue estas credenciales al admin de la junta.',
      },
    };
  }
}
