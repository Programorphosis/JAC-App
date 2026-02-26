import { Module } from '@nestjs/common';
import { MiJuntaController } from './mi-junta.controller';
import { MiJuntaService } from './mi-junta.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { LimitesModule } from '../../infrastructure/limits/limites.module';
import { S3StorageService } from '../../infrastructure/storage/s3-storage.service';

@Module({
  imports: [PrismaModule, AuditModule, LimitesModule],
  controllers: [MiJuntaController],
  providers: [MiJuntaService, S3StorageService],
})
export class MiJuntaModule {}
