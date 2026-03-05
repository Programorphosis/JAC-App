import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { S3StorageService } from '../infrastructure/storage/s3-storage.service';
import { EmailService } from '../infrastructure/email/email.service';

/**
 * Endpoints de salud para orquestadores (Docker, Kubernetes) y balanceadores.
 * /health/live  → liveness:  proceso vivo, sin dependencias externas. < 50 ms.
 * /health/ready → readiness: verifica conexión a BD, S3 y SMTP. 503 si cae una dependencia crítica.
 * /health       → retrocompatibilidad (equivalente a /health/ready).
 */
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3StorageService,
    private readonly email: EmailService,
  ) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    const checks: Record<string, string> = {};
    let healthy = true;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch {
      checks.database = 'disconnected';
      healthy = false;
    }

    if (this.s3.isConfigured()) {
      checks.s3 = (await this.s3.ping()) ? 'connected' : 'disconnected';
    } else {
      checks.s3 = 'not_configured';
    }

    checks.smtp = (await this.email.ping()) ? 'connected' : 'not_configured';

    const result = { ...checks, timestamp: new Date().toISOString() };

    if (!healthy) {
      throw new ServiceUnavailableException({ status: 'error', ...result });
    }

    return { status: 'ok', ...result };
  }

  @Get()
  async check() {
    return this.ready();
  }
}
