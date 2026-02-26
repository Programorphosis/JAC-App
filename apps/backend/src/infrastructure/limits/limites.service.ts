import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LimiteUsuariosExcedidoError,
  LimiteCartasExcedidoError,
  LimiteStorageExcedidoError,
  SuscripcionVencidaError,
  DowngradeUsoExcedeLimitesError,
} from '../../domain/errors';

export interface LimitesPlan {
  limiteUsuarios: number | null;
  limiteStorageMb: number | null;
  limiteCartasMes: number | null;
}

/** Límites efectivos (override ?? plan, con soporte ilimitados). Infinity = ilimitado. */
export interface LimitesEfectivos {
  limiteUsuarios: number;
  limiteStorageMb: number;
  limiteCartasMes: number;
}

export interface UsoActual {
  usuarios: number;
  /** @deprecated Usar storageMb para límites. Mantenido para compatibilidad. */
  documentosCount: number;
  cartasEsteMes: number;
  /** Storage en MB (SUM sizeBytes de documentos de la junta). */
  storageMb: number;
}

export type NivelAlerta = 'OK' | 'ADVERTENCIA' | 'CRITICO' | 'BLOQUEO';

export interface AlertaLimite {
  tipo: 'usuarios' | 'storage' | 'cartas';
  mensaje: string;
  actual: number;
  limite: number;
  porcentaje: number;
  nivel: NivelAlerta;
}

/** Política de vencimiento: BLOQUEO_PARCIAL = bloquear crear/emitir/subir; permitir consultas. */
const VENCIMIENTO_POLICY = 'BLOQUEO_PARCIAL' as const;

/**
 * Servicio de límites por plan (PA-5).
 * Valida cuotas antes de crear usuario, emitir carta, subir documento.
 * Soporta overrides por suscripción, planes ilimitados y política de vencimiento.
 */
@Injectable()
export class LimitesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene límites efectivos (override ?? plan, con ilimitados).
   * null si no hay suscripción o estado no ACTIVA/PRUEBA.
   * Para VENCIDA: las validaciones lanzan SuscripcionVencida antes de llegar aquí.
   */
  async getLimitesEfectivos(juntaId: string): Promise<LimitesEfectivos | null> {
    const suscripcion = await this.prisma.suscripcion.findUnique({
      where: { juntaId },
      include: { plan: true },
    });
    if (!suscripcion || !['ACTIVA', 'PRUEBA'].includes(suscripcion.estado)) {
      return null;
    }

    const { plan } = suscripcion;

    const limiteUsuarios = this.resolverLimite(
      suscripcion.overrideLimiteUsuarios,
      plan.limiteUsuarios,
      plan.permiteUsuariosIlimitados,
    );
    const limiteStorageMb = this.resolverLimite(
      suscripcion.overrideLimiteStorageMb,
      plan.limiteStorageMb,
      plan.permiteStorageIlimitado,
    );
    const limiteCartasMes = this.resolverLimite(
      suscripcion.overrideLimiteCartasMes,
      plan.limiteCartasMes,
      plan.permiteCartasIlimitadas,
    );

    return { limiteUsuarios, limiteStorageMb, limiteCartasMes };
  }

  private resolverLimite(
    override: number | null | undefined,
    planVal: number | null | undefined,
    permiteIlimitado: boolean,
  ): number {
    if (permiteIlimitado) return Infinity;
    const val = override ?? planVal ?? 0;
    return val;
  }

  /** @deprecated Usar getLimitesEfectivos. Mantenido para compatibilidad. */
  async getPlanLimites(juntaId: string): Promise<LimitesPlan | null> {
    const efectivos = await this.getLimitesEfectivos(juntaId);
    if (!efectivos) return null;
    return {
      limiteUsuarios: efectivos.limiteUsuarios === Infinity ? null : efectivos.limiteUsuarios,
      limiteStorageMb: efectivos.limiteStorageMb === Infinity ? null : efectivos.limiteStorageMb,
      limiteCartasMes: efectivos.limiteCartasMes === Infinity ? null : efectivos.limiteCartasMes,
    };
  }

  /** Verifica si la junta tiene suscripción VENCIDA (bloqueo según política). */
  private async esSuscripcionVencida(juntaId: string): Promise<boolean> {
    const suscripcion = await this.prisma.suscripcion.findUnique({
      where: { juntaId },
      select: { estado: true },
    });
    return suscripcion?.estado === 'VENCIDA';
  }

  /** Valida que se pueda crear un usuario. Lanza error de dominio si se excede. */
  async validarCrearUsuario(juntaId: string): Promise<void> {
    if (VENCIMIENTO_POLICY === 'BLOQUEO_PARCIAL' && (await this.esSuscripcionVencida(juntaId))) {
      throw new SuscripcionVencidaError();
    }

    const limites = await this.getLimitesEfectivos(juntaId);
    if (!limites || limites.limiteUsuarios === Infinity) return;

    const { usuarios } = await this.getUsoActual(juntaId);
    if (usuarios >= limites.limiteUsuarios) {
      throw new LimiteUsuariosExcedidoError(limites.limiteUsuarios);
    }
  }

  /** Valida que se pueda emitir una carta este mes. Lanza error de dominio si se excede. */
  async validarEmitirCarta(juntaId: string): Promise<void> {
    if (VENCIMIENTO_POLICY === 'BLOQUEO_PARCIAL' && (await this.esSuscripcionVencida(juntaId))) {
      throw new SuscripcionVencidaError();
    }

    const limites = await this.getLimitesEfectivos(juntaId);
    if (!limites || limites.limiteCartasMes === Infinity) return;

    const { cartasEsteMes } = await this.getUsoActual(juntaId);
    if (cartasEsteMes >= limites.limiteCartasMes) {
      throw new LimiteCartasExcedidoError(limites.limiteCartasMes);
    }
  }

  /** Valida storage antes de subir. sizeBytes: tamaño del archivo a subir en bytes. */
  async validarStorage(juntaId: string, sizeBytesNuevo: number): Promise<void> {
    if (VENCIMIENTO_POLICY === 'BLOQUEO_PARCIAL' && (await this.esSuscripcionVencida(juntaId))) {
      throw new SuscripcionVencidaError();
    }

    const limites = await this.getLimitesEfectivos(juntaId);
    if (!limites || limites.limiteStorageMb === Infinity) return;

    const { storageMb } = await this.getUsoActual(juntaId);
    const nuevoMb = sizeBytesNuevo / 1024 / 1024;
    const totalMb = storageMb + nuevoMb;
    if (totalMb > limites.limiteStorageMb) {
      throw new LimiteStorageExcedidoError(limites.limiteStorageMb);
    }
  }

  /** Obtiene uso actual de la junta. */
  async getUsoActual(juntaId: string): Promise<UsoActual> {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    const [usuarios, docsAgg, documentosCount, cartasEsteMes] = await Promise.all([
      this.prisma.usuario.count({ where: { juntaId } }),
      this.prisma.documento.aggregate({
        where: { usuario: { juntaId } },
        _sum: { sizeBytes: true },
      }),
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

    const totalBytes = docsAgg._sum.sizeBytes ?? 0n;
    const storageMb = Number(totalBytes) / 1024 / 1024;

    return {
      usuarios,
      documentosCount,
      cartasEsteMes,
      storageMb: Math.round(storageMb * 100) / 100,
    };
  }

  /**
   * Uso para un mes concreto (facturación overrides mensual).
   * Cartas: emitidas en ese mes. Usuarios y storage: snapshot actual (no hay histórico).
   * MODELO_OVERRIDES_CONSUMO.md
   */
  async getUsoParaMes(
    juntaId: string,
    year: number,
    month: number,
  ): Promise<{ usuarios: number; storageMb: number; cartasEnMes: number }> {
    const inicioMes = new Date(year, month - 1, 1);
    const finMes = new Date(year, month, 0, 23, 59, 59, 999);

    const [usuarios, docsAgg, cartasEnMes] = await Promise.all([
      this.prisma.usuario.count({ where: { juntaId } }),
      this.prisma.documento.aggregate({
        where: { usuario: { juntaId } },
        _sum: { sizeBytes: true },
      }),
      this.prisma.carta.count({
        where: {
          juntaId,
          estado: 'APROBADA',
          fechaEmision: { gte: inicioMes, lte: finMes },
        },
      }),
    ]);

    const totalBytes = docsAgg._sum.sizeBytes ?? 0n;
    const storageMb = Number(totalBytes) / 1024 / 1024;

    return {
      usuarios,
      storageMb: Math.round(storageMb * 100) / 100,
      cartasEnMes,
    };
  }

  /** Alertas por límites cercanos (>80% de uso). Usa límites efectivos. */
  async getAlertas(juntaId: string): Promise<AlertaLimite[]> {
    const limites = await this.getLimitesEfectivos(juntaId);
    if (!limites) return [];

    const uso = await this.getUsoActual(juntaId);
    const alertas: AlertaLimite[] = [];

    if (limites.limiteUsuarios !== Infinity && limites.limiteUsuarios > 0) {
      const pct = (uso.usuarios / limites.limiteUsuarios) * 100;
      const nivel = this.nivelAlerta(pct);
      if (pct >= 80) {
        alertas.push({
          tipo: 'usuarios',
          mensaje: `Usuarios: ${uso.usuarios}/${limites.limiteUsuarios}`,
          actual: uso.usuarios,
          limite: limites.limiteUsuarios,
          porcentaje: Math.round(pct),
          nivel,
        });
      }
    }

    if (limites.limiteStorageMb !== Infinity && limites.limiteStorageMb > 0) {
      const pct = (uso.storageMb / limites.limiteStorageMb) * 100;
      const nivel = this.nivelAlerta(pct);
      if (pct >= 80) {
        alertas.push({
          tipo: 'storage',
          mensaje: `Storage: ${uso.storageMb.toFixed(1)}/${limites.limiteStorageMb} MB`,
          actual: uso.storageMb,
          limite: limites.limiteStorageMb,
          porcentaje: Math.round(pct),
          nivel,
        });
      }
    }

    if (limites.limiteCartasMes !== Infinity && limites.limiteCartasMes > 0) {
      const pct = (uso.cartasEsteMes / limites.limiteCartasMes) * 100;
      const nivel = this.nivelAlerta(pct);
      if (pct >= 80) {
        alertas.push({
          tipo: 'cartas',
          mensaje: `Cartas este mes: ${uso.cartasEsteMes}/${limites.limiteCartasMes}`,
          actual: uso.cartasEsteMes,
          limite: limites.limiteCartasMes,
          porcentaje: Math.round(pct),
          nivel,
        });
      }
    }

    return alertas;
  }

  /** 80% Advertencia, 95% Crítico, 100% Bloqueo. */
  private nivelAlerta(pct: number): 'OK' | 'ADVERTENCIA' | 'CRITICO' | 'BLOQUEO' {
    if (pct >= 100) return 'BLOQUEO';
    if (pct >= 95) return 'CRITICO';
    if (pct >= 80) return 'ADVERTENCIA';
    return 'OK';
  }

  /**
   * Valida cambio de plan (upgrade/downgrade).
   * - Upgrade: permitido siempre. Nueva fecha según periodo (1 mes o 1 año).
   * - Downgrade: permitido cualquier día. Efectivo al fin del ciclo (o forzarDowngrade).
   *   Valida que uso actual <= límites del plan destino.
   * @param periodo Solo aplica en upgrade. Default 'anual'.
   * @returns { esUpgrade: boolean; nuevaFechaVencimiento?: Date } si válido
   * @throws DowngradeUsoExcedeLimitesError
   */
  async validarCambioPlan(
    juntaId: string,
    planActual: { precioMensual: number; id: string },
    planNuevo: {
      id: string;
      precioMensual: number;
      limiteUsuarios: number | null;
      limiteStorageMb: number | null;
      limiteCartasMes: number | null;
      permiteUsuariosIlimitados?: boolean;
      permiteStorageIlimitado?: boolean;
      permiteCartasIlimitadas?: boolean;
    },
    forzarDowngrade = false,
    periodo: 'mensual' | 'anual' = 'anual',
  ): Promise<{ esUpgrade: boolean; nuevaFechaVencimiento?: Date }> {
    const esUpgrade = planNuevo.precioMensual > planActual.precioMensual;
    const esDowngrade = planNuevo.precioMensual < planActual.precioMensual;

    if (esUpgrade) {
      const hoy = new Date();
      const nuevaFechaVencimiento = new Date(hoy);
      if (periodo === 'mensual') {
        nuevaFechaVencimiento.setMonth(nuevaFechaVencimiento.getMonth() + 1);
      } else {
        nuevaFechaVencimiento.setFullYear(nuevaFechaVencimiento.getFullYear() + 1);
      }
      return { esUpgrade: true, nuevaFechaVencimiento };
    }

    if (esDowngrade) {
      const uso = await this.getUsoActual(juntaId);
      const errores: string[] = [];

      const limiteUsuarios = planNuevo.permiteUsuariosIlimitados
        ? Infinity
        : planNuevo.limiteUsuarios ?? 0;
      if (limiteUsuarios !== Infinity && uso.usuarios > limiteUsuarios) {
        errores.push(
          `Usuarios actuales (${uso.usuarios}) exceden el límite del plan (${limiteUsuarios}).`,
        );
      }

      const limiteStorage = planNuevo.permiteStorageIlimitado
        ? Infinity
        : planNuevo.limiteStorageMb ?? 0;
      if (limiteStorage !== Infinity && uso.storageMb > limiteStorage) {
        errores.push(
          `Storage usado (${uso.storageMb.toFixed(1)} MB) excede el límite del plan (${limiteStorage} MB).`,
        );
      }

      const limiteCartas = planNuevo.permiteCartasIlimitadas
        ? Infinity
        : planNuevo.limiteCartasMes ?? 0;
      if (limiteCartas !== Infinity && uso.cartasEsteMes > limiteCartas) {
        errores.push(
          `Cartas este mes (${uso.cartasEsteMes}) exceden el límite del plan (${limiteCartas}).`,
        );
      }

      if (errores.length > 0) {
        throw new DowngradeUsoExcedeLimitesError(
          `No se puede cambiar a un plan inferior: ${errores.join(' ')}`,
        );
      }

      return { esUpgrade: false };
    }

    return { esUpgrade: false };
  }
}
