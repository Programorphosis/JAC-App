import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../domain/services/audit.service';

/**
 * PA-7 – Operaciones y soporte: notas internas y exportación de datos.
 */
@Injectable()
export class PlatformOperacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Lista notas de una junta. */
  async listarNotas(juntaId: string, page = 1, limit = 50) {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
    });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const skip = (page - 1) * limit;

    const [notas, total] = await Promise.all([
      this.prisma.notaJunta.findMany({
        where: { juntaId },
        skip,
        take: limit,
        orderBy: { fechaCreacion: 'desc' },
        include: {
          creadoPor: { select: { id: true, nombres: true, apellidos: true } },
        },
      }),
      this.prisma.notaJunta.count({ where: { juntaId } }),
    ]);

    return {
      data: notas,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Crea una nota para la junta. */
  async crearNota(juntaId: string, contenido: string, ejecutadoPorId: string) {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
    });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const contenidoTrim = contenido?.trim();
    if (!contenidoTrim) {
      throw new BadRequestException(
        'El contenido de la nota no puede estar vacío',
      );
    }

    const nota = await this.prisma.notaJunta.create({
      data: {
        juntaId,
        contenido: contenidoTrim,
        creadoPorId: ejecutadoPorId,
      },
      include: {
        creadoPor: { select: { id: true, nombres: true, apellidos: true } },
      },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'NotaJunta',
      entidadId: nota.id,
      accion: 'CREACION_NOTA_JUNTA',
      metadata: { longitud: contenidoTrim.length },
      ejecutadoPorId,
    });

    return { data: nota };
  }

  /** Exporta datos de la junta (JSON o CSV). */
  async exportar(juntaId: string, format: 'json' | 'csv' = 'json') {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
      include: {
        suscripcion: { include: { plan: true } },
      },
    });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const [usuarios, tarifas, pagos, cartas, requisitosTipo, facturas, notas] =
      await Promise.all([
        this.prisma.usuario.findMany({
          where: { juntaId },
          select: {
            id: true,
            tipoDocumento: true,
            numeroDocumento: true,
            nombres: true,
            apellidos: true,
            telefono: true,
            activo: true,
            fechaCreacion: true,
          },
        }),
        this.prisma.tarifa.findMany({
          where: { juntaId },
          orderBy: { fechaVigencia: 'desc' },
        }),
        this.prisma.pago.findMany({
          where: { juntaId },
          include: {
            usuario: {
              select: { nombres: true, apellidos: true, numeroDocumento: true },
            },
          },
          orderBy: { fechaPago: 'desc' },
          take: 1000,
        }),
        this.prisma.carta.findMany({
          where: { juntaId },
          include: {
            usuario: {
              select: { nombres: true, apellidos: true, numeroDocumento: true },
            },
          },
          orderBy: { fechaSolicitud: 'desc' },
          take: 500,
        }),
        this.prisma.requisitoTipo.findMany({
          where: { juntaId },
          include: { _count: { select: { estados: true } } },
        }),
        this.prisma.factura.findMany({
          where: { juntaId },
          include: { pagos: true },
          orderBy: { fechaEmision: 'desc' },
        }),
        this.prisma.notaJunta.findMany({
          where: { juntaId },
          include: {
            creadoPor: { select: { nombres: true, apellidos: true } },
          },
          orderBy: { fechaCreacion: 'desc' },
        }),
      ]);

    const payload = {
      exportadoEn: new Date().toISOString(),
      junta: {
        id: junta.id,
        nombre: junta.nombre,
        nit: junta.nit,
        telefono: junta.telefono,
        email: junta.email,
        direccion: junta.direccion,
        ciudad: junta.ciudad,
        departamento: junta.departamento,
        activo: junta.activo,
        enMantenimiento: junta.enMantenimiento,
        fechaCreacion: junta.fechaCreacion,
        suscripcion: junta.suscripcion
          ? {
              plan: junta.suscripcion.plan.nombre,
              estado: junta.suscripcion.estado,
              fechaVencimiento: junta.suscripcion.fechaVencimiento,
            }
          : null,
      },
      resumen: {
        totalUsuarios: usuarios.length,
        totalTarifas: tarifas.length,
        totalPagos: pagos.length,
        totalCartas: cartas.length,
        totalRequisitosTipo: requisitosTipo.length,
        totalFacturas: facturas.length,
        totalNotas: notas.length,
      },
      usuarios,
      tarifas,
      pagos,
      cartas,
      requisitosTipo,
      facturas,
      notas,
    };

    if (format === 'csv') {
      return this.exportarCsv(payload);
    }

    return { data: payload };
  }

  private exportarCsv(payload: Record<string, unknown>): {
    data: string;
    filename: string;
  } {
    const lines: string[] = [];
    lines.push('Sección,Campo,Valor');
    const junta = payload.junta as
      | Record<string, string | number | boolean>
      | undefined;
    const resumen = payload.resumen as Record<string, number> | undefined;
    lines.push(`Junta,nombre,"${String(junta?.nombre ?? '')}"`);
    lines.push(`Junta,nit,"${String(junta?.nit ?? '')}"`);
    lines.push(`Junta,activo,"${String(junta?.activo ?? '')}"`);
    lines.push(`Resumen,totalUsuarios,${String(resumen?.totalUsuarios ?? 0)}`);
    lines.push(`Resumen,totalPagos,${String(resumen?.totalPagos ?? 0)}`);
    lines.push(`Resumen,totalCartas,${String(resumen?.totalCartas ?? 0)}`);

    const usuarios = payload.usuarios as
      | Array<Record<string, string | number | boolean | null>>
      | undefined;
    if (usuarios?.length) {
      lines.push('');
      lines.push('Usuarios');
      lines.push('numeroDocumento,nombres,apellidos,activo,fechaCreacion');
      for (const u of usuarios) {
        const doc = String(u.numeroDocumento ?? '');
        const nom = String(u.nombres ?? '').replace(/"/g, '""');
        const ape = String(u.apellidos ?? '').replace(/"/g, '""');
        const act = u.activo ? 'Sí' : 'No';
        const fc = u.fechaCreacion
          ? new Date(u.fechaCreacion as string).toISOString()
          : '';
        lines.push(`"${doc}","${nom}","${ape}","${act}","${fc}"`);
      }
    }

    const nombreJunta = String(junta?.nombre ?? 'junta').replace(
      /[^a-zA-Z0-9]/g,
      '_',
    );
    const fecha = new Date().toISOString().slice(0, 10);
    const filename = `export_${nombreJunta}_${fecha}.csv`;

    return {
      data: '\uFEFF' + lines.join('\n'),
      filename,
    };
  }
}
