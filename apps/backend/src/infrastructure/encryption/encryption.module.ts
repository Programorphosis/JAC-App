import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';

/**
 * Módulo de encriptación para credenciales sensibles (Wompi por junta).
 * Global para que EncryptionService esté disponible sin importar en cada módulo.
 */
@Global()
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}
