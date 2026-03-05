import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LetterService } from '../../domain/services/letter.service';
import { CartaPdfService } from './carta-pdf.service';
import { LetterEmissionRunner } from './letter-emission-runner.service';
import { S3StorageService } from '../storage/s3-storage.service';

@Module({
  imports: [PrismaModule],
  providers: [
    LetterService,
    CartaPdfService,
    LetterEmissionRunner,
    S3StorageService,
  ],
  exports: [LetterService, LetterEmissionRunner, CartaPdfService],
})
export class LetterModule {}
