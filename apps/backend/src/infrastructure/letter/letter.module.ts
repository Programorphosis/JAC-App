import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LetterService } from '../../domain/services/letter.service';
import { LetterEmissionRunner } from './letter-emission-runner.service';

@Module({
  imports: [PrismaModule],
  providers: [LetterService, LetterEmissionRunner],
  exports: [LetterService, LetterEmissionRunner],
})
export class LetterModule {}
