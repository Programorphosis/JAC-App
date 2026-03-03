import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Global para que EmailService esté disponible sin importar en cada módulo.
 * Configuración vía variables de entorno: EMAIL_TRANSPORT, SMTP_HOST, SMTP_PORT,
 * SMTP_USER, SMTP_PASS, EMAIL_FROM, APP_PUBLIC_URL.
 * Ver docs/EMAIL_SES_SETUP.md para configuración de AWS SES.
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
