import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';
import { AuditService } from '../../domain/services/audit.service';

/**
 * Información de junta para el admin/usuarios de la junta (solo lectura).
 * Similar a PlatformJuntasService.obtener pero sin datos sensibles de plataforma.
 * Incluye wompiConfigurado (sin exponer credenciales).
 * actualizarWompi: solo ADMIN puede configurar credenciales de su junta.
 */
@Injectable()
export class MiJuntaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly audit: AuditService,
  ) {}

  async obtener(juntaId: string) {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
      select: {
        id: true,
        nombre: true,
        nit: true,
        montoCarta: true,
        vigenciaCartaMeses: true,
        fechaCreacion: true,
        activo: true,
        fechaBaja: true,
        telefono: true,
        email: true,
        direccion: true,
        ciudad: true,
        departamento: true,
        enMantenimiento: true,
        wompiPrivateKey: true, // Solo para derivar wompiConfigurado; no se devuelve
        _count: { select: { usuarios: true, pagos: true, cartas: true } },
        suscripcion: {
          select: {
            id: true,
            estado: true,
            fechaInicio: true,
            fechaVencimiento: true,
            plan: {
              select: {
                id: true,
                nombre: true,
                precioMensual: true,
                precioAnual: true,
                limiteUsuarios: true,
                limiteStorageMb: true,
                limiteCartasMes: true,
              },
            },
          },
        },
      },
    });

    if (!junta) {
      throw new NotFoundException('Junta no encontrada');
    }

    const { wompiPrivateKey, ...rest } = junta;
    const baseUrl = process.env.API_PUBLIC_URL?.trim();
    const webhookUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/api/webhooks/wompi` : null;

    return {
      ...rest,
      wompiConfigurado: !!wompiPrivateKey,
      webhookUrl,
    };
  }

  /**
   * Actualiza credenciales Wompi de la junta. Solo ADMIN.
   * WOMPI_POR_JUNTA_DOC §3.1. Reutiliza lógica de PlatformJuntasService.
   */
  async actualizarWompi(
    juntaId: string,
    dto: {
      wompiPrivateKey?: string | null;
      wompiPublicKey?: string | null;
      wompiIntegritySecret?: string | null;
      wompiEventsSecret?: string | null;
      wompiEnvironment?: string | null;
    },
    ejecutadoPorId: string,
  ) {
    const junta = await this.prisma.junta.findUnique({ where: { id: juntaId } });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const data: Record<string, unknown> = {};
    const enc = (v: string | null | undefined): string | null => {
      if (v === undefined) return undefined as unknown as string | null;
      if (v === null || v.trim() === '') return null;
      return this.encryption.encrypt(v.trim());
    };

    if (dto.wompiPrivateKey !== undefined) data.wompiPrivateKey = enc(dto.wompiPrivateKey);
    if (dto.wompiPublicKey !== undefined) data.wompiPublicKey = enc(dto.wompiPublicKey);
    if (dto.wompiIntegritySecret !== undefined)
      data.wompiIntegritySecret = enc(dto.wompiIntegritySecret);
    if (dto.wompiEventsSecret !== undefined) data.wompiEventsSecret = enc(dto.wompiEventsSecret);
    if (dto.wompiEnvironment !== undefined)
      data.wompiEnvironment = dto.wompiEnvironment?.trim() ? dto.wompiEnvironment.trim() : null;

    await this.prisma.junta.update({ where: { id: juntaId }, data });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Junta',
      entidadId: juntaId,
      accion: 'CONFIG_WOMPI_JUNTA',
      metadata: { camposActualizados: Object.keys(data), origen: 'mi-junta' },
      ejecutadoPorId,
    });

    return { ok: true };
  }
}
