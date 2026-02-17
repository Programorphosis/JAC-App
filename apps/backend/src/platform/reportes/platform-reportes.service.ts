import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** BOM UTF-8 para que Excel interprete correctamente acentos y ñ. */
const UTF8_BOM = '\uFEFF';

/**
 * PA-10: Reportes exportables para platform admin.
 */
@Injectable()
export class PlatformReportesService {
  constructor(private readonly prisma: PrismaService) {}

  private escapeCsv(val: unknown): string {
    if (val == null) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  async reporteJuntas(): Promise<{ data: string; filename: string }> {
    const juntas = await this.prisma.junta.findMany({
      include: {
        suscripcion: { include: { plan: true } },
        _count: { select: { usuarios: true, pagos: true, cartas: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    const lines: string[] = [
      'id,nombre,nit,activo,ciudad,departamento,plan,estadoSuscripcion,fechaVencimiento,usuarios,pagos,cartas,fechaCreacion',
    ];

    for (const j of juntas) {
      const plan = j.suscripcion?.plan?.nombre ?? '-';
      const estado = j.suscripcion?.estado ?? '-';
      const venc = j.suscripcion?.fechaVencimiento
        ? new Date(j.suscripcion.fechaVencimiento).toISOString().slice(0, 10)
        : '-';
      const fc = j.fechaCreacion ? new Date(j.fechaCreacion).toISOString().slice(0, 10) : '';

      lines.push(
        [
          j.id,
          this.escapeCsv(j.nombre),
          this.escapeCsv(j.nit),
          j.activo ? 'Sí' : 'No',
          this.escapeCsv(j.ciudad),
          this.escapeCsv(j.departamento),
          plan,
          estado,
          venc,
          j._count.usuarios,
          j._count.pagos,
          j._count.cartas,
          fc,
        ].join(',')
      );
    }

    const filename = `reporte_juntas_${new Date().toISOString().slice(0, 10)}.csv`;
    return { data: UTF8_BOM + lines.join('\n'), filename };
  }

  async reporteFacturacion(): Promise<{ data: string; filename: string }> {
    const facturas = await this.prisma.factura.findMany({
      include: {
        junta: { select: { nombre: true } },
        pagos: true,
      },
      orderBy: { fechaEmision: 'desc' },
      take: 5000,
    });

    const lines: string[] = [
      'facturaId,junta,monto,fechaEmision,fechaVencimiento,estado,tipo,totalPagado,fechaUltimoPago',
    ];

    for (const f of facturas) {
      const totalPagado = f.pagos.reduce((s, p) => s + p.monto, 0);
      const ultimoPago = f.pagos.length
        ? f.pagos.reduce((max, p) => (p.fecha > max ? p.fecha : max), f.pagos[0].fecha)
        : null;

      lines.push(
        [
          f.id,
          this.escapeCsv(f.junta.nombre),
          f.monto,
          new Date(f.fechaEmision).toISOString().slice(0, 10),
          new Date(f.fechaVencimiento).toISOString().slice(0, 10),
          f.estado,
          f.tipo,
          totalPagado,
          ultimoPago ? new Date(ultimoPago).toISOString().slice(0, 10) : '',
        ].join(',')
      );
    }

    const filename = `reporte_facturacion_${new Date().toISOString().slice(0, 10)}.csv`;
    return { data: UTF8_BOM + lines.join('\n'), filename };
  }

  async reporteUso(): Promise<{ data: string; filename: string }> {
    const juntas = await this.prisma.junta.findMany({
      include: {
        suscripcion: { include: { plan: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    const lines: string[] = [
      'juntaId,nombre,plan,limiteUsuarios,limiteCartasMes,limiteStorageMb,usuariosActivos,usuariosTotal,pagosEsteMes,cartasEsteMes,documentos,mes',
    ];

    for (const j of juntas) {
      const [usuariosActivos, usuariosTotal, pagosMes, cartasMes, documentos] =
        await Promise.all([
          this.prisma.usuario.count({ where: { juntaId: j.id, activo: true } }),
          this.prisma.usuario.count({ where: { juntaId: j.id } }),
          this.prisma.pago.count({
            where: { juntaId: j.id, fechaPago: { gte: inicioMes } },
          }),
          this.prisma.carta.count({
            where: {
              juntaId: j.id,
              estado: 'APROBADA',
              fechaEmision: { gte: inicioMes },
            },
          }),
          this.prisma.documento.count({
            where: { usuario: { juntaId: j.id } },
          }),
        ]);

      const plan = j.suscripcion?.plan;
      const limUsu = plan?.limiteUsuarios ?? '';
      const limCartas = plan?.limiteCartasMes ?? '';
      const limStorage = plan?.limiteStorageMb ?? '';
      const mes = now.toLocaleString('es-CO', { month: 'long', year: 'numeric' });

      lines.push(
        [
          j.id,
          this.escapeCsv(j.nombre),
          plan?.nombre ?? '-',
          limUsu,
          limCartas,
          limStorage,
          usuariosActivos,
          usuariosTotal,
          pagosMes,
          cartasMes,
          documentos,
          mes,
        ].join(',')
      );
    }

    const filename = `reporte_uso_${new Date().toISOString().slice(0, 10)}.csv`;
    return { data: UTF8_BOM + lines.join('\n'), filename };
  }
}
