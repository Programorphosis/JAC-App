/**
 * LetterService - Validar requisitos y emitir carta laboral.
 * Dominio puro: no depende de Nest, Prisma ni HTTP.
 * Referencia: definicionDomainServices.md, flujoSolicitudCarta.md, validacionesDeCartaQR.md
 *
 * Toda emisión ocurre dentro de transacción.
 */
import type { ILetterEmissionContext } from '../ports/letter-emission-context.port';
import type { EmitLetterParams, EmitLetterResult } from '../types/letter.types';
import {
  RequisitosCartaNoCumplidosError,
  CartaNoPendienteError,
} from '../errors/domain.errors';
import { randomUUID } from 'crypto';

export class LetterService {
  async emitLetter(
    params: EmitLetterParams,
    ctx: ILetterEmissionContext,
  ): Promise<EmitLetterResult> {
    const { cartaId, juntaId, emitidaPorId } = params;

    const carta = await ctx.getCarta(cartaId, juntaId);
    if (!carta) {
      throw new RequisitosCartaNoCumplidosError('Carta no encontrada');
    }
    if (carta.estado !== 'PENDIENTE') {
      throw new CartaNoPendienteError(cartaId);
    }

    const deuda = await ctx.calculateDebt(carta.usuarioId, juntaId);
    if (deuda.total !== 0) {
      throw new RequisitosCartaNoCumplidosError(
        `Deuda pendiente: ${deuda.total}. Debe estar al día para emitir carta.`,
      );
    }

    const tienePagoCarta = await ctx.hasPagoCarta(carta.usuarioId, juntaId);
    if (!tienePagoCarta) {
      throw new RequisitosCartaNoCumplidosError('No existe pago tipo CARTA');
    }

    const requisitos = await ctx.getRequisitosParaCarta(carta.usuarioId, juntaId);
    for (const req of requisitos) {
      if (req.obligacionActiva && req.estado !== 'AL_DIA') {
        throw new RequisitosCartaNoCumplidosError(
          `Requisito "${req.nombre}" debe estar AL_DIA para emitir carta`,
        );
      }
    }

    const consecutivo = await ctx.getNextConsecutivoCarta(juntaId);
    const anio = new Date().getFullYear();
    const qrToken = randomUUID();
    const fechaEmision = new Date();

    let rutaPdf: string | null = null;
    let hashDocumento: string | null = null;

    if (ctx.generateCartaPdf && carta.usuarioNombres && carta.usuarioApellidos && carta.usuarioDocumento) {
      const pdfResult = await ctx.generateCartaPdf({
        juntaId,
        usuarioId: carta.usuarioId,
        qrToken,
        consecutivo,
        anio,
        usuarioNombres: carta.usuarioNombres,
        usuarioApellidos: carta.usuarioApellidos,
        usuarioDocumento: carta.usuarioDocumento,
        usuarioTelefono: carta.usuarioTelefono,
        usuarioLugarExpedicion: carta.usuarioLugarExpedicion,
        fechaAfiliacion: carta.fechaAfiliacion,
        folio: carta.folio,
        numeral: carta.numeral,
      });
      if (pdfResult) {
        rutaPdf = pdfResult.rutaPdf;
        hashDocumento = pdfResult.hashDocumento ?? null;
      }
    }

    await ctx.updateCartaAprobada({
      cartaId,
      juntaId,
      consecutivo,
      anio,
      qrToken,
      fechaEmision,
      emitidaPorId,
      rutaPdf,
      hashDocumento,
    });

    await ctx.consumePagoCarta(carta.usuarioId, juntaId);

    await ctx.registerAudit({
      juntaId,
      entidad: 'Carta',
      entidadId: cartaId,
      accion: 'EMISION_CARTA',
      metadata: { consecutivo, anio, qrToken },
      ejecutadoPorId: emitidaPorId,
    });

    return {
      cartaId,
      consecutivo,
      anio,
      qrToken,
      rutaPdf,
    };
  }
}
