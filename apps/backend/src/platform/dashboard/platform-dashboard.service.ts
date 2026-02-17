import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Servicio de dashboard para Platform Admin.
 * Métricas globales de la plataforma.
 */
@Injectable()
export class PlatformDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async obtener() {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalJuntas, juntasActivas, juntasNuevasEsteMes] = await Promise.all([
      this.prisma.junta.count(),
      this.prisma.junta.count({ where: { activo: true } }),
      this.prisma.junta.count({
        where: { fechaCreacion: { gte: inicioMes } },
      }),
    ]);

    return {
      data: {
        totalJuntas,
        juntasActivas,
        juntasInactivas: totalJuntas - juntasActivas,
        juntasNuevasEsteMes,
      },
    };
  }
}
