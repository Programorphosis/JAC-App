import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PlatformFacturasService } from './platform-facturas.service';
import { PlatformJuntasService } from '../juntas/platform-juntas.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { RolNombre, EstadoSuscripcion } from '@prisma/client';

/**
 * Cron diario: genera facturas de renovación para suscripciones que vencen en 7 días.
 * PA-6 – Facturación plataforma.
 * PA5-4 – Marca suscripciones vencidas cuando fechaVencimiento < hoy.
 * FLUJOS_SUSCRIPCIONES_PLANES §8: no depende del día 1; corre todos los días.
 */
@Injectable()
export class FacturasCronService {
  private readonly logger = new Logger(FacturasCronService.name);

  constructor(
    private readonly facturas: PlatformFacturasService,
    private readonly juntas: PlatformJuntasService,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  @Cron('0 0 * * * *') // Diario a las 00:00
  async handleFacturasRenovacion() {
    const ejecutadoPorId = await this.obtenerUsuarioAuditoria();
    if (!ejecutadoPorId) {
      this.logger.warn('No se encontró usuario para auditoría. Facturas mensuales omitidas.');
      return;
    }

    try {
      const resultado = await this.facturas.generarFacturasRenovacion(ejecutadoPorId);
      if (resultado.generadas > 0 || resultado.errores.length > 0) {
        this.logger.log(`Renovación: generadas ${resultado.generadas}, omitidas ${resultado.omitidas}`);
        if (resultado.errores.length > 0) {
          this.logger.error('Errores en renovación:', resultado.errores);
        }
      }
    } catch (err) {
      this.logger.error('Error en facturas de renovación', err);
    }
  }

  @Cron('0 1 0 * * *') // Diario a las 00:01 (después de renovación)
  async handleMarcarVencidas() {
    try {
      const count = await this.facturas.marcarFacturasVencidas();
      if (count > 0) {
        this.logger.log(`${count} facturas marcadas como vencidas`);
      }
    } catch (err) {
      this.logger.error('Error marcando facturas vencidas', err);
    }
  }

  @Cron('0 2 1 * * *') // Día 1 de cada mes a las 00:02 (overrides mensuales)
  async handleFacturasOverridesMensuales() {
    const ejecutadoPorId = await this.obtenerUsuarioAuditoria();
    if (!ejecutadoPorId) {
      this.logger.warn('No se encontró usuario para auditoría. Overrides mensuales omitidos.');
      return;
    }

    const ahora = new Date();
    const mesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const mesAno = {
      year: mesAnterior.getFullYear(),
      month: mesAnterior.getMonth() + 1,
    };

    try {
      const resultado = await this.facturas.generarFacturasOverridesMensuales(
        mesAno,
        ejecutadoPorId,
      );
      if (resultado.generadas > 0 || resultado.errores.length > 0) {
        this.logger.log(`Overrides mensuales: generadas ${resultado.generadas}, omitidas ${resultado.omitidas}`);
        if (resultado.errores.length > 0) {
          this.logger.error('Errores overrides mensuales:', resultado.errores);
        }
      }
    } catch (err) {
      this.logger.error('Error en overrides mensuales', err);
    }
  }

  @Cron('0 5 0 * * *') // Diario a las 00:05 (PA5-4: suscripciones vencidas)
  async handleMarcarSuscripcionesVencidas() {
    try {
      const vencidas = await this.juntas.marcarSuscripcionesVencidasConJuntas();
      if (vencidas.length > 0) {
        this.logger.log(`${vencidas.length} suscripciones marcadas como vencidas`);
        for (const junta of vencidas) {
          if (junta.email) {
            void this.email.enviarSuscripcionVencida({
              juntaNombre: junta.nombre,
              juntaEmail: junta.email,
            });
          }
        }
      }
    } catch (err) {
      this.logger.error('Error marcando suscripciones vencidas', err);
    }
  }

  /** Notifica a las juntas cuya suscripción vence en 1 o 3 días. Corre a las 09:00. */
  @Cron('0 0 9 * * *')
  async handleNotificacionesVencimientoProximo() {
    try {
      const ahora = new Date();
      const dias = [1, 3];

      for (const d of dias) {
        const inicio = new Date(ahora);
        inicio.setDate(inicio.getDate() + d);
        inicio.setHours(0, 0, 0, 0);

        const fin = new Date(inicio);
        fin.setHours(23, 59, 59, 999);

        const suscripciones = await this.prisma.suscripcion.findMany({
          where: {
            estado: { in: [EstadoSuscripcion.ACTIVA, EstadoSuscripcion.PRUEBA] },
            fechaVencimiento: { gte: inicio, lte: fin },
            cancelacionSolicitada: false,
          },
          include: { junta: { select: { nombre: true, email: true } } },
        });

        for (const susc of suscripciones) {
          if (susc.junta.email) {
            void this.email.enviarSuscripcionPorVencer({
              juntaNombre: susc.junta.nombre,
              juntaEmail: susc.junta.email,
              diasRestantes: d,
              fechaVencimiento: susc.fechaVencimiento,
            });
          }
        }

        if (suscripciones.length > 0) {
          this.logger.log(`Notificaciones vencimiento en ${d} día(s): ${suscripciones.length} juntas`);
        }
      }
    } catch (err) {
      this.logger.error('Error en notificaciones de vencimiento próximo', err);
    }
  }

  private async obtenerUsuarioAuditoria(): Promise<string | null> {
    const platformAdmin = await this.prisma.usuario.findFirst({
      where: {
        roles: {
          some: {
            rol: { nombre: RolNombre.PLATFORM_ADMIN },
          },
        },
      },
      select: { id: true },
    });
    return platformAdmin?.id ?? null;
  }
}
