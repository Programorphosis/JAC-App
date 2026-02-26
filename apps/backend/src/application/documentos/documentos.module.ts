import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { LimitesModule } from '../../infrastructure/limits/limites.module';
import { DocumentosController } from './documentos.controller';
import { DocumentosUsuarioController } from './documentos-usuario.controller';
import { DocumentosService } from './documentos.service';
import { S3StorageService } from '../../infrastructure/storage/s3-storage.service';

@Module({
  imports: [AuthModule, PrismaModule, LimitesModule],
  controllers: [DocumentosController, DocumentosUsuarioController],
  providers: [DocumentosService, S3StorageService],
  exports: [DocumentosService],
})
export class DocumentosModule {}
