import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RequisitoOperationRunner } from '../../infrastructure/requisito/requisito-operation-runner.service';
import { RolNombre } from '@prisma/client';

/**
 * Cron día 1: aplicar corte mensual a requisitos con tieneCorteAutomatico=true.
 * Usuarios con obligacionActiva=true y estado=AL_DIA pasan a MORA.
 * Procesa cada junta de forma independiente: el fallo de una no detiene las demás.
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
    const juntas = await this.prisma.junta.findMany({
      where: { activo: true },
      select: { id: true },
    });

    if (juntas.length === 0) {
      console.log('[RequisitosCron] No hay juntas activas. Corte omitido.');
      return;
    }

    let procesadas = 0;
    let errores = 0;

    for (const junta of juntas) {
      const auditUserId = await this.obtenerUsuarioAuditoriaPorJunta(junta.id);
      if (!auditUserId) {
        console.warn(
          `[RequisitosCron] Junta ${junta.id}: sin usuario admin para auditoría. Omitida.`,
        );
        errores++;
        continue;
      }

      try {
        await this.runner.applyMonthlyCutoff({
          juntaId: junta.id,
          ejecutadoPorId: auditUserId,
        });
        procesadas++;
      } catch (err) {
        console.error(`[RequisitosCron] Error en junta ${junta.id}:`, err);
        errores++;
      }
    }

    console.log(
      `[RequisitosCron] Corte mensual completado. Procesadas: ${procesadas}, Errores: ${errores}`,
    );
  }

  /** Obtiene el ADMIN de una junta específica para usar como ejecutadoPorId en auditoría. */
  private async obtenerUsuarioAuditoriaPorJunta(
    juntaId: string,
  ): Promise<string | null> {
    const admin = await this.prisma.usuario.findFirst({
      where: {
        juntaId,
        activo: true,
        roles: {
          some: { rol: { nombre: RolNombre.ADMIN } },
        },
      },
      select: { id: true },
    });
    return admin?.id ?? null;
  }
}
