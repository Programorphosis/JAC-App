import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';
import { AuditService } from '../../domain/services/audit.service';
import { LimitesService } from '../../infrastructure/limits/limites.service';
import { S3StorageService } from '../../infrastructure/storage/s3-storage.service';
import { AlmacenamientoNoConfiguradoError } from '../../domain/errors';
import { EstadoSuscripcion, EstadoFactura, TipoFactura } from '@prisma/client';
import {
  calcularFechaVencimiento,
  getEstadoSuscripcion,
} from '../../common/utils/suscripcion-fechas.util';

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
    private readonly limites: LimitesService,
    private readonly s3: S3StorageService,
  ) {}

  async obtener(juntaId: string) {
    const [junta, tarifasCount] = await Promise.all([
      this.prisma.junta.findUnique({
        where: { id: juntaId },
        select: {
        id: true,
        nombre: true,
        nit: true,
        escudoS3Key: true,
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
            periodo: true,
            planIdPendiente: true,
            overrideLimiteUsuarios: true,
            overrideLimiteStorageMb: true,
            overrideLimiteCartasMes: true,
            esPlanPersonalizado: true,
            motivoPersonalizacion: true,
            cancelacionSolicitada: true,
            fechaCancelacionSolicitada: true,
            plan: {
              select: {
                id: true,
                nombre: true,
                descripcion: true,
                precioMensual: true,
                precioAnual: true,
                limiteUsuarios: true,
                limiteStorageMb: true,
                limiteCartasMes: true,
                esPersonalizable: true,
                permiteUsuariosIlimitados: true,
                permiteStorageIlimitado: true,
                permiteCartasIlimitadas: true,
                precioPorUsuarioAdicional: true,
                precioPorMbAdicional: true,
                precioPorCartaAdicional: true,
              },
            },
          },
        },
      },
    }),
      this.prisma.tarifa.count({ where: { juntaId } }),
    ]);

    if (!junta) {
      throw new NotFoundException('Junta no encontrada');
    }

    const { wompiPrivateKey, escudoS3Key, ...rest } = junta;
    const baseUrl = process.env.API_PUBLIC_URL?.trim();
    const webhookUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/api/webhooks/wompi` : null;

    return {
      ...rest,
      wompiConfigurado: !!wompiPrivateKey,
      webhookUrl,
      tieneTarifas: tarifasCount > 0,
      escudoConfigurado: !!escudoS3Key,
    };
  }

  /**
   * Uso actual, límites efectivos y alertas de la junta.
   * Para vista plan-suscripcion: consumo, fechas, alertas.
   */
  async consumo(juntaId: string) {
    const junta = await this.prisma.junta.findUnique({ where: { id: juntaId } });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const [uso, limites, alertas] = await Promise.all([
      this.limites.getUsoActual(juntaId),
      this.limites.getLimitesEfectivos(juntaId),
      this.limites.getAlertas(juntaId),
    ]);

    const now = new Date();
    const mesActual = now.toLocaleString('es-CO', { month: 'long', year: 'numeric' });

    return {
      data: {
        uso: {
          usuarios: uso.usuarios,
          storageMb: uso.storageMb,
          cartasEsteMes: uso.cartasEsteMes,
        },
        limites: limites
          ? {
              limiteUsuarios: limites.limiteUsuarios === Infinity ? null : limites.limiteUsuarios,
              limiteStorageMb: limites.limiteStorageMb === Infinity ? null : limites.limiteStorageMb,
              limiteCartasMes: limites.limiteCartasMes === Infinity ? null : limites.limiteCartasMes,
            }
          : null,
        alertas,
        mesActual,
      },
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

  /**
   * Solicita no renovar la suscripción al final del período actual.
   *
   * NO cambia el estado de la suscripción (sigue ACTIVA/PRUEBA con sus límites normales).
   * El cron de renovación omite suscripciones con cancelacionSolicitada=true.
   * Cuando llegue fechaVencimiento, el cron existente la marcará VENCIDA normalmente.
   *
   * No hay devoluciones: el período ya pagado se respeta íntegramente.
   * Solo ADMIN puede solicitar la cancelación.
   */
  async cancelarSuscripcion(juntaId: string, motivo: string | undefined, ejecutadoPorId: string) {
    const suscripcion = await this.prisma.suscripcion.findUnique({
      where: { juntaId },
      include: { plan: { select: { nombre: true } } },
    });
    if (!suscripcion) throw new NotFoundException('La junta no tiene suscripción activa');

    const estadosActivos: string[] = ['ACTIVA', 'PRUEBA'];
    if (!estadosActivos.includes(suscripcion.estado)) {
      throw new BadRequestException('Solo se pueden cancelar suscripciones activas o en período de prueba');
    }
    if (suscripcion.cancelacionSolicitada) {
      throw new BadRequestException('La cancelación ya fue solicitada anteriormente');
    }

    // Solo marcamos la intención — el estado NO cambia, los límites del plan siguen vigentes
    await this.prisma.suscripcion.update({
      where: { juntaId },
      data: {
        cancelacionSolicitada: true,
        fechaCancelacionSolicitada: new Date(),
      },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Suscripcion',
      entidadId: suscripcion.id,
      accion: 'CANCELACION_SUSCRIPCION_SOLICITADA',
      metadata: {
        planNombre: suscripcion.plan.nombre,
        fechaVencimiento: suscripcion.fechaVencimiento,
        motivo: motivo?.trim() || 'Sin motivo especificado',
      },
      ejecutadoPorId,
    });

    return {
      ok: true,
      mensaje: `Cancelación registrada. El acceso y los límites del plan permanecen hasta el ${suscripcion.fechaVencimiento.toLocaleDateString('es-CO')}. No se generará renovación.`,
    };
  }

  /**
   * Actualiza datos de contacto de la junta. Solo ADMIN.
   * No permite modificar NIT (dato comercial sensible).
   */
  async actualizarDatos(
    juntaId: string,
    dto: {
      telefono?: string | null;
      email?: string | null;
      direccion?: string | null;
      ciudad?: string | null;
      departamento?: string | null;
    },
    ejecutadoPorId: string,
  ) {
    const junta = await this.prisma.junta.findUnique({ where: { id: juntaId } });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const data: Record<string, unknown> = {};
    if (dto.telefono !== undefined) data.telefono = dto.telefono?.trim() || null;
    if (dto.email !== undefined) data.email = dto.email?.trim() || null;
    if (dto.direccion !== undefined) data.direccion = dto.direccion?.trim() || null;
    if (dto.ciudad !== undefined) data.ciudad = dto.ciudad?.trim() || null;
    if (dto.departamento !== undefined) data.departamento = dto.departamento?.trim() || null;

    if (Object.keys(data).length === 0) return { ok: true };

    await this.prisma.junta.update({ where: { id: juntaId }, data });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Junta',
      entidadId: juntaId,
      accion: 'ACTUALIZACION_DATOS_JUNTA',
      metadata: { campos: Object.keys(data) },
      ejecutadoPorId,
    });

    return { ok: true };
  }

  /**
   * Sube el escudo municipal a S3 y actualiza junta. Solo ADMIN.
   * Estructura S3: juntas/{juntaId}/escudo.png
   */
  async subirEscudo(
    juntaId: string,
    file: { buffer: Buffer; mimetype: string; size: number },
    ejecutadoPorId: string,
  ) {
    if (!this.s3.isConfigured()) {
      throw new AlmacenamientoNoConfiguradoError();
    }

    const junta = await this.prisma.junta.findUnique({ where: { id: juntaId } });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    this.s3.validateEscudoFile(file);

    const key = `juntas/${juntaId}/escudo.png`;
    await this.s3.upload({
      key,
      body: file.buffer,
      contentType: 'image/png',
    });

    await this.prisma.junta.update({
      where: { id: juntaId },
      data: { escudoS3Key: key },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Junta',
      entidadId: juntaId,
      accion: 'SUBIDA_ESCUDO_JUNTA',
      metadata: { s3Key: key },
      ejecutadoPorId,
    });

    return { ok: true, s3Key: key };
  }

  /** Lista planes activos disponibles para que la junta elija. Solo ADMIN. */
  async listarPlanes() {
    const planes = await this.prisma.plan.findMany({
      where: { activo: true },
      orderBy: { precioMensual: 'asc' },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        precioMensual: true,
        precioAnual: true,
        limiteUsuarios: true,
        limiteStorageMb: true,
        limiteCartasMes: true,
        esPersonalizable: true,
        permiteUsuariosIlimitados: true,
        permiteStorageIlimitado: true,
        permiteCartasIlimitadas: true,
        diasPrueba: true,
        precioPorUsuarioAdicional: true,
        precioPorMbAdicional: true,
        precioPorCartaAdicional: true,
      },
    });
    return { data: planes };
  }

  /** Crea suscripción para la junta. Solo ADMIN. La junta elige su plan. */
  async crearSuscripcion(
    juntaId: string,
    planId: string,
    diasPrueba: number | undefined,
    periodo: 'mensual' | 'anual' | undefined,
    ejecutadoPorId: string,
  ) {
    const existente = await this.prisma.suscripcion.findUnique({
      where: { juntaId },
    });
    if (existente) {
      throw new BadRequestException('La junta ya tiene una suscripción');
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (!plan.activo) {
      throw new BadRequestException('El plan no está disponible');
    }

    const fechaInicio = new Date();
    const dias = diasPrueba ?? plan.diasPrueba ?? 0;
    const fechaVencimiento = calcularFechaVencimiento({
      fechaInicio,
      diasPrueba: dias,
      periodo: dias > 0 ? undefined : periodo,
    });
    const estado = getEstadoSuscripcion(dias) as EstadoSuscripcion;

    const periodoFactura = periodo ?? 'anual';
    const suscripcion = await this.prisma.suscripcion.create({
      data: {
        juntaId,
        planId,
        fechaInicio,
        fechaVencimiento,
        periodo: periodoFactura,
        estado,
      },
      include: { plan: true },
    });

    if (dias > 0) {
      const periodoFactura = periodo ?? 'anual';
      const monto = periodoFactura === 'mensual' ? plan.precioMensual : plan.precioAnual;
      await this.prisma.factura.create({
        data: {
          juntaId,
          suscripcionId: suscripcion.id,
          monto,
          fechaVencimiento: new Date(fechaVencimiento),
          estado: EstadoFactura.PENDIENTE,
          tipo: TipoFactura.SUSCRIPCION,
          metadata: { periodo: periodoFactura },
          creadoPorId: ejecutadoPorId,
        },
      });
    }

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Suscripcion',
      entidadId: suscripcion.id,
      accion: 'CREACION_SUSCRIPCION',
      metadata: { planId, planNombre: plan.nombre, origen: 'mi-junta' },
      ejecutadoPorId,
    });

    return { data: suscripcion };
  }

  /** Actualiza suscripción: cambiar plan u overrides (si plan personalizable). Solo ADMIN. */
  async actualizarSuscripcion(
    juntaId: string,
    data: {
      planId?: string;
      periodo?: 'mensual' | 'anual';
      overrideLimiteUsuarios?: number | null;
      overrideLimiteStorageMb?: number | null;
      overrideLimiteCartasMes?: number | null;
      motivoPersonalizacion?: string | null;
    },
    ejecutadoPorId: string,
  ) {
    const suscripcion = await this.prisma.suscripcion.findUnique({
      where: { juntaId },
      include: { plan: true },
    });
    if (!suscripcion) throw new NotFoundException('La junta no tiene suscripción');

    const updateData: Record<string, unknown> = {};
    if (data.planId) {
      const plan = await this.prisma.plan.findUnique({ where: { id: data.planId } });
      if (!plan) throw new NotFoundException('Plan no encontrado');
      if (!plan.activo) throw new BadRequestException('El plan no está disponible');

      const resultado = await this.limites.validarCambioPlan(
        juntaId,
        { precioMensual: suscripcion.plan.precioMensual, id: suscripcion.plan.id },
        plan,
        false,
        data.periodo ?? 'anual',
      );
      const esDowngrade = plan.precioMensual < suscripcion.plan.precioMensual;
      const p = data.periodo ?? 'anual';

      if (esDowngrade) {
        // Downgrade: efectivo al fin del ciclo (planIdPendiente)
        updateData.planIdPendiente = data.planId;
        updateData.periodoPendiente = p;
      } else {
        // Upgrade o mismo tier
        updateData.planId = data.planId;
        const debeActualizarFecha =
          resultado.esUpgrade || (!esDowngrade && data.periodo != null);
        if (debeActualizarFecha) {
          updateData.fechaVencimiento = calcularFechaVencimiento({
            fechaInicio: new Date(),
            diasPrueba: 0,
            periodo: p,
          });
          updateData.periodo = p;
        }
        updateData.planIdPendiente = null;
        updateData.periodoPendiente = null;
      }
      updateData.overrideLimiteUsuarios = null;
      updateData.overrideLimiteStorageMb = null;
      updateData.overrideLimiteCartasMes = null;
      updateData.esPlanPersonalizado = false;
    }

    const tieneOverrides =
      data.overrideLimiteUsuarios !== undefined ||
      data.overrideLimiteStorageMb !== undefined ||
      data.overrideLimiteCartasMes !== undefined;
    if (tieneOverrides) {
      const planId = data.planId ?? suscripcion.planId;
      const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
      if (!plan?.esPersonalizable) {
        throw new BadRequestException(
          'El plan no permite overrides. Elija un plan personalizable para aumentar capacidades.',
        );
      }
      if (data.overrideLimiteUsuarios !== undefined)
        updateData.overrideLimiteUsuarios = data.overrideLimiteUsuarios;
      if (data.overrideLimiteStorageMb !== undefined)
        updateData.overrideLimiteStorageMb = data.overrideLimiteStorageMb;
      if (data.overrideLimiteCartasMes !== undefined)
        updateData.overrideLimiteCartasMes = data.overrideLimiteCartasMes;
      if (data.motivoPersonalizacion !== undefined)
        updateData.motivoPersonalizacion = data.motivoPersonalizacion;
      updateData.esPlanPersonalizado = true;
    }

    const actualizada = await this.prisma.suscripcion.update({
      where: { juntaId },
      data: updateData,
      include: { plan: true },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Suscripcion',
      entidadId: suscripcion.id,
      accion: 'ACTUALIZACION_SUSCRIPCION',
      metadata: { ...data, origen: 'mi-junta' },
      ejecutadoPorId,
    });

    return { data: actualizada };
  }
}
