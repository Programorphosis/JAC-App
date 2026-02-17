import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface LimitesPlan {
  limiteUsuarios: number | null;
  limiteStorageMb: number | null;
  limiteCartasMes: number | null;
}

export interface UsoActual {
  usuarios: number;
  documentosCount: number;
  cartasEsteMes: number;
}

export interface AlertaLimite {
  tipo: 'usuarios' | 'storage' | 'cartas';
  mensaje: string;
  actual: number;
  limite: number;
  porcentaje: number;
}

/**
 * Servicio de límites por plan (PA-5).
 * Valida cuotas antes de crear usuario, emitir carta, subir documento.
 */
@Injectable()
export class LimitesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Obtiene el plan activo de la junta (límites). null si no tiene suscripción. */
  async getPlanLimites(juntaId: string): Promise<LimitesPlan | null> {
    const suscripcion = await this.prisma.suscripcion.findUnique({
      where: { juntaId },
      include: { plan: true },
    });
    if (!suscripcion || !['ACTIVA', 'PRUEBA'].includes(suscripcion.estado)) {
      return null;
    }
    return {
      limiteUsuarios: suscripcion.plan.limiteUsuarios,
      limiteStorageMb: suscripcion.plan.limiteStorageMb,
      limiteCartasMes: suscripcion.plan.limiteCartasMes,
    };
  }

  /** Obtiene uso actual de la junta. */
  async getUsoActual(juntaId: string): Promise<UsoActual> {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    const [usuarios, documentosCount, cartasEsteMes] = await Promise.all([
      this.prisma.usuario.count({ where: { juntaId } }),
      this.prisma.documento.count({
        where: { usuario: { juntaId } },
      }),
      this.prisma.carta.count({
        where: {
          juntaId,
          estado: 'APROBADA',
          fechaEmision: { gte: inicioMes },
        },
      }),
    ]);

    return { usuarios, documentosCount, cartasEsteMes };
  }

  /** Valida que se pueda crear un usuario. Lanza ForbiddenException si se excede el límite. */
  async validarCrearUsuario(juntaId: string): Promise<void> {
    const limites = await this.getPlanLimites(juntaId);
    if (!limites || limites.limiteUsuarios == null) return;

    const { usuarios } = await this.getUsoActual(juntaId);
    if (usuarios >= limites.limiteUsuarios) {
      throw new ForbiddenException(
        `Límite de usuarios alcanzado (${limites.limiteUsuarios}). Actualice su plan.`
      );
    }
  }

  /** Valida que se pueda emitir una carta este mes. Lanza ForbiddenException si se excede. */
  async validarEmitirCarta(juntaId: string): Promise<void> {
    const limites = await this.getPlanLimites(juntaId);
    if (!limites || limites.limiteCartasMes == null) return;

    const { cartasEsteMes } = await this.getUsoActual(juntaId);
    if (cartasEsteMes >= limites.limiteCartasMes) {
      throw new ForbiddenException(
        `Límite de cartas del mes alcanzado (${limites.limiteCartasMes}). Actualice su plan.`
      );
    }
  }

  /** Valida storage (usa count de documentos como proxy: 1 doc ≈ 1 MB). */
  async validarStorage(juntaId: string, documentosNuevos = 1): Promise<void> {
    const limites = await this.getPlanLimites(juntaId);
    if (!limites || limites.limiteStorageMb == null) return;

    const { documentosCount } = await this.getUsoActual(juntaId);
    const totalEstimado = documentosCount + documentosNuevos;
    if (totalEstimado > limites.limiteStorageMb) {
      throw new ForbiddenException(
        `Límite de almacenamiento alcanzado (${limites.limiteStorageMb} documentos aprox.). Actualice su plan.`
      );
    }
  }

  /** Alertas por límites cercanos (>80% de uso). */
  async getAlertas(juntaId: string): Promise<AlertaLimite[]> {
    const limites = await this.getPlanLimites(juntaId);
    if (!limites) return [];

    const uso = await this.getUsoActual(juntaId);
    const alertas: AlertaLimite[] = [];

    if (limites.limiteUsuarios != null && limites.limiteUsuarios > 0) {
      const pct = (uso.usuarios / limites.limiteUsuarios) * 100;
      if (pct >= 80) {
        alertas.push({
          tipo: 'usuarios',
          mensaje: `Usuarios: ${uso.usuarios}/${limites.limiteUsuarios}`,
          actual: uso.usuarios,
          limite: limites.limiteUsuarios,
          porcentaje: Math.round(pct),
        });
      }
    }

    if (limites.limiteStorageMb != null && limites.limiteStorageMb > 0) {
      const pct = (uso.documentosCount / limites.limiteStorageMb) * 100;
      if (pct >= 80) {
        alertas.push({
          tipo: 'storage',
          mensaje: `Documentos: ${uso.documentosCount}/${limites.limiteStorageMb} (aprox. MB)`,
          actual: uso.documentosCount,
          limite: limites.limiteStorageMb,
          porcentaje: Math.round(pct),
        });
      }
    }

    if (limites.limiteCartasMes != null && limites.limiteCartasMes > 0) {
      const pct = (uso.cartasEsteMes / limites.limiteCartasMes) * 100;
      if (pct >= 80) {
        alertas.push({
          tipo: 'cartas',
          mensaje: `Cartas este mes: ${uso.cartasEsteMes}/${limites.limiteCartasMes}`,
          actual: uso.cartasEsteMes,
          limite: limites.limiteCartasMes,
          porcentaje: Math.round(pct),
        });
      }
    }

    return alertas;
  }
}
