import { TipoPago, RolNombre } from '@prisma/client';

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
import type {
  ILetterEmissionContext,
  CartaParaEmitir,
} from '../../domain/ports/letter-emission-context.port';
import type { RequisitoParaCarta } from '../../domain/types/requisito.types';
import type { DebtResult } from '../../domain/types/debt.types';
import type { RegisterAuditEventParams } from '../../domain/types/audit.types';
import { EscudoNoConfiguradoError } from '../../domain/errors';
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
          select: {
            nombres: true,
            apellidos: true,
            numeroDocumento: true,
            telefono: true,
            lugarExpedicion: true,
            fechaAfiliacion: true,
            folio: true,
            numeral: true,
          },
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
      fechaAfiliacion: carta.usuario.fechaAfiliacion,
      folio: carta.usuario.folio,
      numeral: carta.usuario.numeral,
      usuarioTelefono: carta.usuario.telefono,
      usuarioLugarExpedicion: carta.usuario.lugarExpedicion,
    };
  }

  async hasPagoCarta(usuarioId: string, juntaId: string): Promise<boolean> {
    const count = await this.client.pago.count({
      where: { usuarioId, juntaId, tipo: TipoPago.CARTA, vigencia: true },
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
    juntaId: string;
    consecutivo: number;
    anio: number;
    qrToken: string;
    fechaEmision: Date;
    emitidaPorId: string;
    rutaPdf?: string | null;
    hashDocumento?: string | null;
  }): Promise<void> {
    const junta = await this.client.junta.findUnique({
      where: { id: data.juntaId },
      select: { vigenciaCartaMeses: true },
    });
    const meses = junta?.vigenciaCartaMeses ?? 3;
    const vigenciaHasta = addMonths(data.fechaEmision, meses);

    await this.client.carta.update({
      where: { id: data.cartaId },
      data: {
        estado: 'APROBADA',
        consecutivo: data.consecutivo,
        anio: data.anio,
        qrToken: data.qrToken,
        fechaEmision: data.fechaEmision,
        vigenciaHasta,
        emitidaPorId: data.emitidaPorId,
        rutaPdf: data.rutaPdf ?? null,
        hashDocumento: data.hashDocumento ?? null,
      },
    });
  }

  async consumePagoCarta(usuarioId: string, juntaId: string): Promise<void> {
    const pago = await this.client.pago.findFirst({
      where: { usuarioId, juntaId, tipo: TipoPago.CARTA, vigencia: true },
      orderBy: { fechaPago: 'desc' },
      select: { id: true },
    });
    if (pago) {
      await this.client.pago.update({
        where: { id: pago.id },
        data: { vigencia: false },
      });
    }
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
      fechaAfiliacion?: Date | null;
      folio?: number | null;
      numeral?: number | null;
      juntaNombre?: string;
      juntaNit?: string | null;
      juntaDepartamento?: string | null;
      juntaCiudad?: string | null;
      juntaPersoneriaJuridica?: string | null;
      usuarioTelefono?: string | null;
      usuarioLugarExpedicion?: string | null;
    },
  ): Promise<{ rutaPdf: string; hashDocumento?: string } | null> {
    if (!this.pdfService?.isConfigured()) return null;

    const junta = await this.client.junta.findUnique({
      where: { id: data.juntaId },
      select: {
        nombre: true,
        nit: true,
        departamento: true,
        ciudad: true,
        personeriaJuridica: true,
        membreteUrl: true,
        escudoS3Key: true,
        email: true,
      },
    });

    if (!junta?.escudoS3Key) {
      throw new EscudoNoConfiguradoError();
    }

    const [presidente, secretaria] = await Promise.all([
      this.obtenerUsuarioPorRol(data.juntaId, RolNombre.ADMIN),
      this.obtenerUsuarioPorRol(data.juntaId, RolNombre.SECRETARIA),
    ]);

    const juntaNombre = junta?.nombre ?? '';
    const personeria = junta?.personeriaJuridica ?? null;
    const useMembrete = !!junta?.membreteUrl;
    const fechaEmision = new Date();

    return this.pdfService.generateAndUpload(
      {
        qrToken: data.qrToken,
        consecutivo: data.consecutivo,
        anio: data.anio,
        usuarioNombres: data.usuarioNombres,
        usuarioApellidos: data.usuarioApellidos,
        usuarioDocumento: data.usuarioDocumento,
        usuarioTelefono: data.usuarioTelefono ?? null,
        usuarioLugarExpedicion: data.usuarioLugarExpedicion ?? null,
        fechaAfiliacion: data.fechaAfiliacion ?? null,
        folio: data.folio ?? null,
        numeral: data.numeral ?? null,
        juntaNombre,
        juntaNit: junta?.nit ?? null,
        juntaDepartamento: junta?.departamento ?? null,
        juntaCiudad: junta?.ciudad ?? null,
        juntaPersoneriaJuridica: personeria,
        juntaEmail: junta?.email ?? null,
        membreteUrl: junta?.membreteUrl ?? null,
        escudoS3Key: junta?.escudoS3Key ?? null,
        presidente: presidente
          ? {
              nombres: presidente.nombres,
              apellidos: presidente.apellidos,
              tipoDocumento: presidente.tipoDocumento,
              numeroDocumento: presidente.numeroDocumento,
              lugarExpedicion: presidente.lugarExpedicion ?? null,
              telefono: presidente.telefono ?? null,
              cargo: `PRESIDENTE DE LA J.A.C ${juntaNombre}`,
            }
          : null,
        secretaria: secretaria
          ? {
              nombres: secretaria.nombres,
              apellidos: secretaria.apellidos,
              tipoDocumento: secretaria.tipoDocumento,
              numeroDocumento: secretaria.numeroDocumento,
              lugarExpedicion: secretaria.lugarExpedicion ?? null,
              telefono: secretaria.telefono ?? null,
              cargo: `SECRETARIA DE LA J.A.C ${juntaNombre}`,
            }
          : null,
        fechaEmision,
      },
      data.juntaId,
      data.usuarioId,
      { useMembrete },
    );
  }

  private async obtenerUsuarioPorRol(
    juntaId: string,
    rolNombre: RolNombre,
  ): Promise<{
    nombres: string;
    apellidos: string;
    tipoDocumento: string;
    numeroDocumento: string;
    lugarExpedicion: string | null;
    telefono: string | null;
  } | null> {
    const rol = await this.client.rol.findUnique({
      where: { nombre: rolNombre as RolNombre },
      select: { id: true },
    });
    if (!rol) return null;

    const usuario = await this.client.usuario.findFirst({
      where: {
        juntaId,
        roles: { some: { rolId: rol.id } },
      },
      select: {
        nombres: true,
        apellidos: true,
        tipoDocumento: true,
        numeroDocumento: true,
        lugarExpedicion: true,
        telefono: true,
      },
    });
    return usuario;
  }
}
