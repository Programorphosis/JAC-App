import { Module } from '@nestjs/common';
import { DebtModule } from '../../infrastructure/debt/debt.module';
import { DeudaController } from './deuda.controller';

@Module({
  imports: [DebtModule],
  controllers: [DeudaController],
})
export class DeudaModule {}
