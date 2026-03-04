import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AvisosJuntaController } from './avisos-junta.controller';
import { AvisosJuntaService } from './avisos-junta.service';

/**
 * Avisos de junta – comunicados admin/secretaria → afiliados.
 * Independiente de PlatformModule (avisos plataforma).
 */
@Module({
  imports: [AuthModule, AuditModule, PrismaModule],
  controllers: [AvisosJuntaController],
  providers: [AvisosJuntaService],
  exports: [AvisosJuntaService],
})
export class AvisosJuntaModule {}
