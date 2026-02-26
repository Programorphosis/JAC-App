import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Endpoints de salud para orquestadores (Docker, Kubernetes) y balanceadores.
 * /health/live  → liveness:  proceso vivo, sin dependencias externas. < 50 ms.
 * /health/ready → readiness: verifica conexión a BD. 503 si cae una dependencia.
 * /health       → retrocompatibilidad (equivalente a /health/ready).
 */
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: solo verifica que el proceso está vivo. Sin DB. */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /** Readiness: verifica conexión a PostgreSQL antes de enviar tráfico. */
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected', timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'disconnected' });
    }
  }

  /** Retrocompatibilidad con el endpoint original. Equivalente a /health/ready. */
  @Get()
  async check() {
    return this.ready();
  }
}
