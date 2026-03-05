/**
 * DebtService - Calcular deuda dinámica de JUNTA.
 * Dominio puro: no depende de Nest, Prisma ni HTTP.
 * Referencia: definicionDomainServices.md, calculadoraDeDeuda.md
 *
 * Nunca guarda deuda. Nunca modifica datos. Solo calcula.
 */
import type { IDebtDataProvider } from '../ports/debt-data-provider.port';
import type {
  CalculateUserDebtParams,
  DebtResult,
  DebtMonthDetail,
} from '../types/debt.types';
import { UsuarioNoEncontradoError } from '../errors/domain.errors';

export class DebtService {
  constructor(private readonly dataProvider: IDebtDataProvider) {}

  async calculateUserDebt(
    params: CalculateUserDebtParams,
  ): Promise<DebtResult> {
    const { usuarioId, juntaId, fechaCorte } = params;
    const corte = fechaCorte ?? new Date();

    const usuario = await this.dataProvider.getUsuarioParaCalculo(
      usuarioId,
      juntaId,
    );
    if (!usuario) {
      throw new UsuarioNoEncontradoError(usuarioId);
    }

    const ultimoPago = await this.dataProvider.getUltimoPagoJunta(
      usuarioId,
      juntaId,
    );

    const inicio = ultimoPago
      ? this.primeroDelMesSiguiente(ultimoPago.fechaPago)
      : this.primeroDelMes(usuario.fechaCreacion);

    const fin = this.ultimoDiaMesAnterior(corte);

    if (inicio > fin) {
      return { total: 0, detalle: [] };
    }

    const meses = this.generarMeses(inicio, fin);
    const detalle: DebtMonthDetail[] = [];
    let total = 0;

    for (const { year, month } of meses) {
      const estadoLaboral = await this.dataProvider.getEstadoLaboralEnMes(
        usuarioId,
        juntaId,
        year,
        month,
      );

      const tarifaAplicada = await this.dataProvider.getTarifaVigente(
        juntaId,
        estadoLaboral,
        year,
        month,
      );

      total += tarifaAplicada;
      detalle.push({ year, month, estadoLaboral, tarifaAplicada });
    }

    return { total, detalle };
  }

  private primeroDelMes(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  private primeroDelMesSiguiente(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }

  private ultimoDiaMesAnterior(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 0);
  }

  private generarMeses(
    inicio: Date,
    fin: Date,
  ): Array<{ year: number; month: number }> {
    const meses: Array<{ year: number; month: number }> = [];
    const current = new Date(inicio.getFullYear(), inicio.getMonth(), 1);

    while (current <= fin) {
      meses.push({
        year: current.getFullYear(),
        month: current.getMonth() + 1,
      });
      current.setMonth(current.getMonth() + 1);
    }

    return meses;
  }
}
