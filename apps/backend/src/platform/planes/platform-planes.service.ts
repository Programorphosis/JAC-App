import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearPlanDto } from '../dto/crear-plan.dto';
import { ActualizarPlanDto } from '../dto/actualizar-plan.dto';

/**
 * Servicio de planes para Platform Admin.
 * CRUD de planes (plantillas comerciales).
 */
@Injectable()
export class PlatformPlanesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(incluirInactivos = false) {
    const planes = await this.prisma.plan.findMany({
      where: incluirInactivos ? {} : { activo: true },
      orderBy: { precioMensual: 'asc' },
    });
    return { data: planes };
  }

  async obtener(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return { data: plan };
  }

  async crear(dto: CrearPlanDto) {
    const existente = await this.prisma.plan.findUnique({
      where: { nombre: dto.nombre.trim() },
    });
    if (existente) {
      throw new ConflictException(`Ya existe un plan con nombre "${dto.nombre}"`);
    }

    const plan = await this.prisma.plan.create({
      data: {
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
        precioMensual: dto.precioMensual,
        precioAnual: dto.precioAnual,
        limiteUsuarios: dto.permiteUsuariosIlimitados ? null : (dto.limiteUsuarios ?? null),
        limiteStorageMb: dto.permiteStorageIlimitado ? null : (dto.limiteStorageMb ?? null),
        limiteCartasMes: dto.permiteCartasIlimitadas ? null : (dto.limiteCartasMes ?? null),
        permiteUsuariosIlimitados: dto.permiteUsuariosIlimitados ?? false,
        permiteStorageIlimitado: dto.permiteStorageIlimitado ?? false,
        permiteCartasIlimitadas: dto.permiteCartasIlimitadas ?? false,
        esPersonalizable: dto.esPersonalizable ?? false,
        diasPrueba: dto.diasPrueba ?? 0,
        precioPorUsuarioAdicional: dto.precioPorUsuarioAdicional ?? null,
        precioPorMbAdicional: dto.precioPorMbAdicional ?? null,
        precioPorCartaAdicional: dto.precioPorCartaAdicional ?? null,
      },
    });
    return { data: plan };
  }

  async actualizar(id: string, dto: ActualizarPlanDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    if (dto.nombre !== undefined && dto.nombre.trim() !== plan.nombre) {
      const existente = await this.prisma.plan.findUnique({
        where: { nombre: dto.nombre.trim() },
      });
      if (existente) {
        throw new ConflictException(`Ya existe un plan con nombre "${dto.nombre}"`);
      }
    }

    const permiteUsuarios = dto.permiteUsuariosIlimitados ?? plan.permiteUsuariosIlimitados;
    const permiteStorage = dto.permiteStorageIlimitado ?? plan.permiteStorageIlimitado;
    const permiteCartas = dto.permiteCartasIlimitadas ?? plan.permiteCartasIlimitadas;

    const actualizado = await this.prisma.plan.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion?.trim() || null }),
        ...(dto.precioMensual !== undefined && { precioMensual: dto.precioMensual }),
        ...(dto.precioAnual !== undefined && { precioAnual: dto.precioAnual }),
        limiteUsuarios: permiteUsuarios ? null : (dto.limiteUsuarios ?? plan.limiteUsuarios),
        limiteStorageMb: permiteStorage ? null : (dto.limiteStorageMb ?? plan.limiteStorageMb),
        limiteCartasMes: permiteCartas ? null : (dto.limiteCartasMes ?? plan.limiteCartasMes),
        ...(dto.permiteUsuariosIlimitados !== undefined && { permiteUsuariosIlimitados: dto.permiteUsuariosIlimitados }),
        ...(dto.permiteStorageIlimitado !== undefined && { permiteStorageIlimitado: dto.permiteStorageIlimitado }),
        ...(dto.permiteCartasIlimitadas !== undefined && { permiteCartasIlimitadas: dto.permiteCartasIlimitadas }),
        ...(dto.esPersonalizable !== undefined && { esPersonalizable: dto.esPersonalizable }),
        ...(dto.diasPrueba !== undefined && { diasPrueba: dto.diasPrueba }),
        ...(dto.activo !== undefined && { activo: dto.activo }),
        ...(dto.precioPorUsuarioAdicional !== undefined && {
          precioPorUsuarioAdicional: dto.precioPorUsuarioAdicional,
        }),
        ...(dto.precioPorMbAdicional !== undefined && {
          precioPorMbAdicional: dto.precioPorMbAdicional,
        }),
        ...(dto.precioPorCartaAdicional !== undefined && {
          precioPorCartaAdicional: dto.precioPorCartaAdicional,
        }),
      },
    });
    return { data: actualizado };
  }
}
