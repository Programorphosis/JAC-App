import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { LetterModule } from '../../infrastructure/letter/letter.module';
import { S3StorageService } from '../../infrastructure/storage/s3-storage.service';
import { CartasController } from './cartas.controller';
import { CartasService } from './cartas.service';

@Module({
  imports: [AuthModule, PrismaModule, LetterModule],
  providers: [CartasService, S3StorageService],
  controllers: [CartasController],
  exports: [CartasService],
})
export class CartasModule {}
