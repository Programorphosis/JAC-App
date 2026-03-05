import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LimitesService } from '../../infrastructure/limits/limites.service';
import { EstadoSuscripcion } from '@prisma/client';

/**
 * Servicio de dashboard para Platform Admin.
 * Métricas globales de la plataforma.
 * PA5-5: Juntas vencidas y cercanas a límite.
 */
@Injectable()
export class PlatformDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limites: LimitesService,
  ) {}

  async obtener() {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalJuntas,
      juntasActivas,
      juntasNuevasEsteMes,
      juntasVencidas,
      juntasConAlertas,
    ] = await Promise.all([
      this.prisma.junta.count(),
      this.prisma.junta.count({ where: { activo: true } }),
      this.prisma.junta.count({
        where: { fechaCreacion: { gte: inicioMes } },
      }),
      this.prisma.junta.count({
        where: {
          suscripcion: { estado: EstadoSuscripcion.VENCIDA },
        },
      }),
      this.contarJuntasConAlertas(),
    ]);

    return {
      data: {
        totalJuntas,
        juntasActivas,
        juntasInactivas: totalJuntas - juntasActivas,
        juntasNuevasEsteMes,
        juntasVencidas,
        juntasCercanasALimite: juntasConAlertas,
      },
    };
  }

  /** Cuenta juntas con al menos una alerta >80%. */
  private async contarJuntasConAlertas(): Promise<number> {
    const juntas = await this.prisma.junta.findMany({
      where: {
        suscripcion: {
          estado: { in: [EstadoSuscripcion.ACTIVA, EstadoSuscripcion.PRUEBA] },
        },
      },
      select: { id: true },
    });
    let count = 0;
    for (const j of juntas) {
      const alertas = await this.limites.getAlertas(j.id);
      if (alertas.length > 0) count++;
    }
    return count;
  }
}
