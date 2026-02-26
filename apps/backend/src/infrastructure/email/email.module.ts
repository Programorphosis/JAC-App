import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Global para que EmailService esté disponible sin importar en cada módulo.
 * Configuración vía variables de entorno: MAILGUN_API_KEY, MAILGUN_DOMAIN,
 * EMAIL_FROM, MAILGUN_REGION, APP_PUBLIC_URL.
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
