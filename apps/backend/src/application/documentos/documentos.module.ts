import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DocumentosController } from './documentos.controller';
import { DocumentosUsuarioController } from './documentos-usuario.controller';
import { DocumentosService } from './documentos.service';
import { S3StorageService } from '../../infrastructure/storage/s3-storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentosController, DocumentosUsuarioController],
  providers: [DocumentosService, S3StorageService],
  exports: [DocumentosService],
})
export class DocumentosModule {}
