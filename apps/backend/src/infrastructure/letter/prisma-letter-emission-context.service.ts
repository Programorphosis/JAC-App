import { TipoPago } from '@prisma/client';
import type {
  ILetterEmissionContext,
  CartaParaEmitir,
} from '../../domain/ports/letter-emission-context.port';
import type { RequisitoParaCarta } from '../../domain/types/requisito.types';
import type { DebtResult } from '../../domain/types/debt.types';
import type { RegisterAuditEventParams } from '../../domain/types/audit.types';
import { DebtService } from '../../domain/services/debt.service';
import { PrismaDebtDataProvider } from '../debt/prisma-debt-data-provider.service';
import type { CartaPdfService } from './carta-pdf.service';

/** Cliente Prisma o transacción. */
type PrismaTx = Omit<
  import('@prisma/client').PrismaClient,
  '$on' | '$connect' | '$disconnect' | '$transaction' | '$extends'
>;

export interface PrismaLetterEmissionContextOptions {
  pdfService?: CartaPdfService;
}

export class PrismaLetterEmissionContext implements ILetterEmissionContext {
  private readonly debtService: DebtService;
  private readonly pdfService?: CartaPdfService;

  constructor(
    private readonly client: PrismaTx,
    options?: PrismaLetterEmissionContextOptions,
  ) {
    const provider = new PrismaDebtDataProvider(client);
    this.debtService = new DebtService(provider);
    this.pdfService = options?.pdfService;
  }

  async calculateDebt(usuarioId: string, juntaId: string): Promise<DebtResult> {
    return this.debtService.calculateUserDebt({ usuarioId, juntaId });
  }

  async getCarta(cartaId: string, juntaId: string): Promise<CartaParaEmitir | null> {
    const carta = await this.client.carta.findFirst({
      where: { id: cartaId, juntaId },
      include: {
        usuario: {
          select: { nombres: true, apellidos: true, numeroDocumento: true },
        },
      },
    });
    if (!carta) return null;
    return {
      id: carta.id,
      usuarioId: carta.usuarioId,
      juntaId: carta.juntaId,
      estado: carta.estado,
      usuarioNombres: carta.usuario.nombres,
      usuarioApellidos: carta.usuario.apellidos,
      usuarioDocumento: carta.usuario.numeroDocumento,
    };
  }

  async hasPagoCarta(usuarioId: string, juntaId: string): Promise<boolean> {
    const count = await this.client.pago.count({
      where: { usuarioId, juntaId, tipo: TipoPago.CARTA },
    });
    return count > 0;
  }

  async getRequisitosParaCarta(
    usuarioId: string,
    juntaId: string,
  ): Promise<RequisitoParaCarta[]> {
    const requisitos = await this.client.requisitoTipo.findMany({
      where: { juntaId, activo: true },
      include: {
        estados: {
          where: { usuarioId },
          take: 1,
        },
      },
    });

    return requisitos.map((rt) => {
      const estado = rt.estados[0];
      return {
        requisitoTipoId: rt.id,
        nombre: rt.nombre,
        obligacionActiva: estado?.obligacionActiva ?? true,
        estado: (estado?.estado ?? 'MORA') as RequisitoParaCarta['estado'],
      };
    });
  }

  async getNextConsecutivoCarta(juntaId: string): Promise<number> {
    const anio = new Date().getFullYear();
    const tipo = 'CARTA';

    const existente = await this.client.consecutivo.findUnique({
      where: { juntaId_tipo_anio: { juntaId, tipo, anio } },
    });

    if (!existente) {
      await this.client.consecutivo.create({
        data: { juntaId, tipo, anio, valorActual: 1 },
      });
      return 1;
    }

    const actualizado = await this.client.consecutivo.update({
      where: { id: existente.id },
      data: { valorActual: { increment: 1 } },
    });
    return actualizado.valorActual;
  }

  async updateCartaAprobada(data: {
    cartaId: string;
    consecutivo: number;
    anio: number;
    qrToken: string;
    fechaEmision: Date;
    emitidaPorId: string;
    rutaPdf?: string | null;
    hashDocumento?: string | null;
  }): Promise<void> {
    await this.client.carta.update({
      where: { id: data.cartaId },
      data: {
        estado: 'APROBADA',
        consecutivo: data.consecutivo,
        anio: data.anio,
        qrToken: data.qrToken,
        fechaEmision: data.fechaEmision,
        emitidaPorId: data.emitidaPorId,
        rutaPdf: data.rutaPdf ?? null,
        hashDocumento: data.hashDocumento ?? null,
      },
    });
  }

  async registerAudit(params: RegisterAuditEventParams): Promise<void> {
    await this.client.auditoria.create({
      data: {
        juntaId: params.juntaId,
        entidad: params.entidad,
        entidadId: params.entidadId,
        accion: params.accion,
        metadata: params.metadata as object,
        ejecutadoPorId: params.ejecutadoPorId,
      },
    });
  }

  async generateCartaPdf(
    data: {
      juntaId: string;
      usuarioId: string;
      qrToken: string;
      consecutivo: number;
      anio: number;
      usuarioNombres: string;
      usuarioApellidos: string;
      usuarioDocumento: string;
    },
  ): Promise<{ rutaPdf: string; hashDocumento?: string } | null> {
    if (!this.pdfService?.isConfigured()) return null;
    return this.pdfService.generateAndUpload(
      {
        qrToken: data.qrToken,
        consecutivo: data.consecutivo,
        anio: data.anio,
        usuarioNombres: data.usuarioNombres,
        usuarioApellidos: data.usuarioApellidos,
        usuarioDocumento: data.usuarioDocumento,
      },
      data.juntaId,
      data.usuarioId,
    );
  }
}
