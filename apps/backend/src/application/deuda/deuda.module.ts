import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { DebtModule } from '../../infrastructure/debt/debt.module';
import { DeudaController } from './deuda.controller';

@Module({
  imports: [AuthModule, DebtModule],
  controllers: [DeudaController],
})
export class DeudaModule {}
