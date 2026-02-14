import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RequisitoOperationRunner } from '../../infrastructure/requisito/requisito-operation-runner.service';
import { RolNombre } from '@prisma/client';

/**
 * Cron día 1: aplicar corte mensual a requisitos con tieneCorteAutomatico=true.
 * Usuarios con obligacionActiva=true y estado=AL_DIA pasan a MORA.
 * Referencia: flujoRequisitosAdicionales.md, consecutivosYCronJobs.md
 */
@Injectable()
export class RequisitosCronService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: RequisitoOperationRunner,
  ) {}

  @Cron('0 0 1 * *') // Día 1 de cada mes a las 00:00
  async handleMonthlyCutoff() {
    const auditUserId = await this.obtenerUsuarioAuditoria();
    if (!auditUserId) {
      console.warn(
        '[RequisitosCron] No se encontró usuario para auditoría. Corte mensual omitido.',
      );
      return;
    }

    try {
      await this.runner.applyMonthlyCutoff({
        ejecutadoPorId: auditUserId,
      });
    } catch (err) {
      console.error('[RequisitosCron] Error en corte mensual:', err);
    }
  }

  private async obtenerUsuarioAuditoria(): Promise<string | null> {
    const admin = await this.prisma.usuario.findFirst({
      where: {
        roles: {
          some: {
            rol: { nombre: RolNombre.ADMIN },
          },
        },
      },
      select: { id: true },
    });
    return admin?.id ?? null;
  }
}
