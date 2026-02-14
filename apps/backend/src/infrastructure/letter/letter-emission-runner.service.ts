import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LetterService } from '../../domain/services/letter.service';
import { CartaPdfService } from './carta-pdf.service';
import { PrismaLetterEmissionContext } from './prisma-letter-emission-context.service';
import type { EmitLetterParams } from '../../domain/types/letter.types';
import type { EmitLetterResult } from '../../domain/types/letter.types';

/**
 * Orquesta la emisión de carta dentro de una transacción.
 */
@Injectable()
export class LetterEmissionRunner {
  constructor(
    private readonly prisma: PrismaService,
    private readonly letterService: LetterService,
    private readonly cartaPdfService: CartaPdfService,
  ) {}

  async emitLetter(params: EmitLetterParams): Promise<EmitLetterResult> {
    return this.prisma.$transaction(async (tx) => {
      const ctx = new PrismaLetterEmissionContext(tx, {
        pdfService: this.cartaPdfService,
      });
      return this.letterService.emitLetter(params, ctx);
    });
  }
}
