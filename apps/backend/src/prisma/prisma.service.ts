import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Zona horaria para Colombia. Las fechas se almacenan y consultan en hora local. */
const TIMEZONE = 'America/Bogota';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    await this.$executeRawUnsafe(`SET time zone '${TIMEZONE}'`);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
