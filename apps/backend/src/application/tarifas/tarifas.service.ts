import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../domain/services/audit.service';
import type { CreateTarifaDto } from './dto/create-tarifa.dto';

@Injectable()
export class TarifasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listar(
    juntaId: string,
    estadoLaboral?: 'TRABAJANDO' | 'NO_TRABAJANDO',
  ) {
    const where: {
      juntaId: string;
      estadoLaboral?: 'TRABAJANDO' | 'NO_TRABAJANDO';
    } = {
      juntaId,
    };

    if (estadoLaboral) {
      where.estadoLaboral = estadoLaboral;
    }

    const tarifas = await this.prisma.tarifa.findMany({
      where,
      orderBy: { fechaVigencia: 'desc' },
    });

    return { data: tarifas };
  }

  async crear(dto: CreateTarifaDto, juntaId: string, creadoPorId: string) {
    // Capturar tarifa anterior vigente para incluirla en la auditoría (trazabilidad del cambio)
    const tarifaAnterior = await this.prisma.tarifa.findFirst({
      where: {
        juntaId,
        estadoLaboral: dto.estadoLaboral,
      },
      orderBy: { fechaVigencia: 'desc' },
    });

    const tarifa = await this.prisma.tarifa.create({
      data: {
        juntaId,
        estadoLaboral: dto.estadoLaboral,
        valorMensual: dto.valorMensual,
        fechaVigencia: new Date(dto.fechaVigencia),
      },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Tarifa',
      entidadId: tarifa.id,
      accion: 'ALTA_TARIFA',
      metadata: {
        estadoLaboral: dto.estadoLaboral,
        valorMensual: dto.valorMensual,
        fechaVigencia: dto.fechaVigencia,
        tarifaAnterior: tarifaAnterior
          ? {
              id: tarifaAnterior.id,
              valorMensual: tarifaAnterior.valorMensual,
              fechaVigencia: tarifaAnterior.fechaVigencia.toISOString(),
            }
          : null,
      },
      ejecutadoPorId: creadoPorId,
    });

    return tarifa;
  }
}
