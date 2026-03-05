import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, LoggerService } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * Logger JSON para producción (NODE_ENV=production).
 * Cada línea es un objeto JSON — compatible con cualquier agregador de logs
 * (Loki, CloudWatch, Datadog, ELK, etc.).
 * En desarrollo se usa el Logger por defecto de NestJS (salida legible).
 */
class ProdLogger implements LoggerService {
  private write(
    level: string,
    message: unknown,
    context?: string,
    trace?: string,
  ) {
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      ctx: context,
      msg:
        typeof message === 'object'
          ? JSON.stringify(message)
          : String(message as string | number),
      ...(trace && { trace }),
    });
    if (level === 'error' || level === 'warn') {
      process.stderr.write(entry + '\n');
    } else {
      process.stdout.write(entry + '\n');
    }
  }

  log(message: unknown, context?: string) {
    this.write('info', message, context);
  }
  error(message: unknown, trace?: string, ctx?: string) {
    this.write('error', message, ctx, trace);
  }
  warn(message: unknown, context?: string) {
    this.write('warn', message, context);
  }
  debug(message: unknown, context?: string) {
    this.write('debug', message, context);
  }
  verbose(message: unknown, context?: string) {
    this.write('verbose', message, context);
  }
  fatal(message: unknown, context?: string) {
    this.write('fatal', message, context);
  }
}

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'ENCRYPTION_MASTER_KEY',
];

function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    const msg = `[Bootstrap] Variables de entorno requeridas no configuradas: ${missing.join(', ')}. La aplicación no puede iniciar.`;

    console.error(msg);
    process.exit(1);
  }
}

async function bootstrap() {
  validateEnv();

  const isProd = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create(AppModule, {
    logger: isProd ? new ProdLogger() : undefined, // undefined → logger por defecto de NestJS en dev
  });
  const logger = isProd ? new ProdLogger() : new Logger('Bootstrap');

  // Headers de seguridad HTTP (CSP, HSTS, X-Content-Type-Options, etc.)
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
            },
          }
        : false, // Desactivar CSP en dev para Swagger UI
      crossOriginEmbedderPolicy: isProd,
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
    }),
  );

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
  });

  // Swagger — documentación de API (solo en desarrollo o si SWAGGER_ENABLED=true)
  const swaggerEnabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.SWAGGER_ENABLED === 'true';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('JAC App API')
      .setDescription('API para Juntas de Acción Comunal en Colombia')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger disponible en /api/docs');
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Aplicación iniciada en el puerto ${port}`);
}
void bootstrap();
