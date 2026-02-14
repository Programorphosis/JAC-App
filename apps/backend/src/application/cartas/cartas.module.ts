import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LetterModule } from '../../infrastructure/letter/letter.module';
import { CartasController } from './cartas.controller';
import { CartasService } from './cartas.service';

@Module({
  imports: [PrismaModule, LetterModule],
  controllers: [CartasController],
  providers: [CartasService],
  exports: [CartasService],
})
export class CartasModule {}
