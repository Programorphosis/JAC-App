/**
 * Módulo de cartas - solicitud y validación.
 * Referencia: flujoSolicitudCarta.md
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  Header,
} from '@nestjs/common';
import { StreamableFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JuntaGuard } from '../../auth/guards/junta.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolNombre } from '@prisma/client';
import type { FirmaCartaData } from '../../infrastructure/letter/carta-pdf.service';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { PermissionService } from '../../auth/permission.service';
import { CartasService } from './cartas.service';
import { RechazarCartaDto } from './dto/rechazar-carta.dto';
import { LetterEmissionRunner } from '../../infrastructure/letter/letter-emission-runner.service';
import { CartaPdfService } from '../../infrastructure/letter/carta-pdf.service';
import { LimitesService } from '../../infrastructure/limits/limites.service';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuarioNoEncontradoError } from '../../domain/errors';

@Controller('cartas')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class CartasController {
  constructor(
    private readonly cartas: CartasService,
    private readonly letterRunner: LetterEmissionRunner,
    private readonly cartaPdf: CartaPdfService,
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly limites: LimitesService,
  ) {}

  /**
   * GET /cartas - Listar cartas.
   * ?usuarioId=xxx → cartas del usuario. ?estado=PENDIENTE → solo pendientes (SECRETARIA).
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.FISCAL, RolNombre.AFILIADO)
  async listar(
    @Query('usuarioId') usuarioId: string | undefined,
    @Query('estado') estado: string | undefined,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    const user = req.user;

    if (usuarioId?.trim()) {
      if (!this.permissions.puedeVerCartasDeOtro(user) && usuarioId !== user.id) {
        throw new ForbiddenException('Solo puede listar sus propias cartas');
      }
      const data = await this.cartas.listarPorUsuario(usuarioId.trim(), juntaId);
      return { data, meta: { timestamp: new Date().toISOString() } };
    }

    if (estado === 'PENDIENTE') {
      if (!this.permissions.puedeListarCartasPendientes(user)) {
        throw new ForbiddenException('Solo SECRETARIA o FISCAL pueden listar cartas pendientes');
      }
      const data = await this.cartas.listarPendientes(juntaId);
      return { data, meta: { timestamp: new Date().toISOString() } };
    }

    throw new BadRequestException('Se requiere usuarioId o estado=PENDIENTE');
  }

  /**
   * POST /cartas/solicitar - Crear carta en estado PENDIENTE.
   * AFILIADO: solo para sí mismo. SECRETARIA: para cualquier usuario de la junta.
   */
  @Post('solicitar')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.SECRETARIA, RolNombre.AFILIADO)
  async solicitar(
    @Body('usuarioId') usuarioId: string,
    @Request() req: { user: JwtUser },
  ) {
    if (!usuarioId?.trim()) {
      throw new BadRequestException('usuarioId es requerido');
    }

    const user = req.user;
    const juntaId = user.juntaId!;

    if (!this.permissions.puedeSolicitarCartaParaOtro(user) && usuarioId !== user.id) {
      throw new ForbiddenException('Solo puede solicitar carta para sí mismo');
    }

    const data = await this.cartas.solicitar(usuarioId.trim(), juntaId, user.id);
    return {
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  /**
   * GET /cartas/pdf-prueba/:usuarioId - Generar PDF de prueba con datos del usuario.
   * Solo SECRETARIA o FISCAL (puedeVerCartasDeOtro). No consume pago ni crea carta.
   */
  @Get('pdf-prueba/:usuarioId')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.SECRETARIA, RolNombre.FISCAL)
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="carta-prueba.pdf"')
  async pdfPrueba(
    @Param('usuarioId') usuarioId: string,
    @Request() req: { user: JwtUser },
  ): Promise<StreamableFile> {
    const juntaId = req.user.juntaId!;
    const user = req.user;

    if (!this.permissions.puedeVerCartasDeOtro(user)) {
      throw new ForbiddenException('Solo SECRETARIA o FISCAL pueden generar PDF de prueba');
    }

    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId.trim(), juntaId },
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
    });
    if (!usuario) {
      throw new UsuarioNoEncontradoError(usuarioId);
    }

    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
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

    const [presidente, secretaria] = await Promise.all([
      this.obtenerUsuarioPorRol(juntaId, RolNombre.ADMIN),
      this.obtenerUsuarioPorRol(juntaId, RolNombre.SECRETARIA),
    ]);

    const juntaNombre = junta?.nombre ?? '';
    const fechaEmision = new Date();
    const anio = fechaEmision.getFullYear();

    const data = {
      qrToken: `prueba-${Date.now()}`,
      consecutivo: 0,
      anio,
      usuarioNombres: usuario.nombres,
      usuarioApellidos: usuario.apellidos,
      usuarioDocumento: usuario.numeroDocumento,
      usuarioTelefono: usuario.telefono ?? null,
      usuarioLugarExpedicion: usuario.lugarExpedicion ?? null,
      fechaAfiliacion: usuario.fechaAfiliacion ?? null,
      folio: usuario.folio ?? null,
      numeral: usuario.numeral ?? null,
      juntaNombre,
      juntaNit: junta?.nit ?? null,
      juntaDepartamento: junta?.departamento ?? null,
      juntaCiudad: junta?.ciudad ?? null,
      juntaPersoneriaJuridica: junta?.personeriaJuridica ?? null,
      juntaEmail: junta?.email ?? null,
      membreteUrl: junta?.membreteUrl ?? null,
      escudoS3Key: junta?.escudoS3Key ?? null,
      presidente: presidente
        ? this.toFirmaCartaData(presidente, juntaNombre, 'PRESIDENTE')
        : null,
      secretaria: secretaria
        ? this.toFirmaCartaData(secretaria, juntaNombre, 'SECRETARIA')
        : null,
      fechaEmision,
    };

    const pdfBytes = await this.cartaPdf.generatePdfBytes(data, {
      useMembrete: !!junta?.membreteUrl,
    });
    const buffer = Buffer.from(pdfBytes);
    return new StreamableFile(buffer);
  }

  /**
   * GET /cartas/:id/descargar - Obtener URL firmada para descargar PDF.
   * AFILIADO: solo propias. SECRETARIA: cualquiera de la junta.
   */
  @Get(':id/descargar')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.SECRETARIA, RolNombre.FISCAL, RolNombre.AFILIADO)
  async descargar(
    @Param('id') cartaId: string,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    const user = req.user;

    const soloPropios = this.permissions.puedeVerCartasDeOtro(user) ? undefined : user.id;

    const url = await this.cartas.getUrlDescargaCarta(cartaId, juntaId, soloPropios);
    return { data: { url } };
  }

  /**
   * POST /cartas/:id/rechazar - Rechazar carta PENDIENTE con motivo opcional.
   * Solo SECRETARIA. CHECKLIST_OPERACION §5.1.
   */
  @Post(':id/rechazar')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.SECRETARIA)
  async rechazar(
    @Param('id') cartaId: string,
    @Body() body: RechazarCartaDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    const data = await this.cartas.rechazar(
      cartaId,
      juntaId,
      body.motivoRechazo?.trim() || null,
      req.user.id,
    );
    return { data, meta: { timestamp: new Date().toISOString() } };
  }

  /**
   * POST /cartas/:id/validar - Validar y aprobar carta.
   * Solo SECRETARIA.
   */
  @Post(':id/validar')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.SECRETARIA)
  async validar(
    @Param('id') cartaId: string,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    await this.limites.validarEmitirCarta(juntaId);

    const result = await this.letterRunner.emitLetter({
      cartaId,
      juntaId,
      emitidaPorId: req.user.id,
    });

    return {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    };
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
    const rol = await this.prisma.rol.findUnique({
      where: { nombre: rolNombre },
      select: { id: true },
    });
    if (!rol) return null;

    const usuario = await this.prisma.usuario.findFirst({
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

  private toFirmaCartaData(
    u: {
      nombres: string;
      apellidos: string;
      tipoDocumento: string;
      numeroDocumento: string;
      lugarExpedicion: string | null;
      telefono: string | null;
    },
    juntaNombre: string,
    rolLabel: 'PRESIDENTE' | 'SECRETARIA',
  ): FirmaCartaData {
    const cargo =
      rolLabel === 'PRESIDENTE'
        ? `PRESIDENTE DE LA J.A.C ${juntaNombre}`
        : `SECRETARIA DE LA J.A.C ${juntaNombre}`;
    return {
      nombres: u.nombres,
      apellidos: u.apellidos,
      tipoDocumento: u.tipoDocumento,
      numeroDocumento: u.numeroDocumento,
      lugarExpedicion: u.lugarExpedicion ?? null,
      telefono: u.telefono ?? null,
      cargo,
    };
  }
}
