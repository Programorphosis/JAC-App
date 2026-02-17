import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Servicio de planes para Platform Admin.
 */
@Injectable()
export class PlatformPlanesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    const planes = await this.prisma.plan.findMany({
      where: { activo: true },
      orderBy: { precioMensual: 'asc' },
    });
    return { data: planes };
  }
}
