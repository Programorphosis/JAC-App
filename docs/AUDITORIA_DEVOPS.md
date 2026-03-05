# Auditoría DevOps — JAC App

> Generado: 2026-03-04
> Objetivo: Lista completa de hallazgos para mejorar el proyecto antes de producción comercial.
> Cada punto explica **qué es**, **por qué importa** y **cómo se resuelve**.

---

## Cómo usar este documento

- [ ] Marca cada ítem cuando lo completes.
- Los ítems están ordenados por prioridad dentro de cada sección.
- Las secciones están ordenadas de más crítico a menos crítico.
- Cada ítem tiene un **nivel de esfuerzo** estimado: `[5min]`, `[1h]`, `[1d]`, `[1sem]`.

---

## Índice

1. [Configuración de producción (bugs activos)](#1-configuración-de-producción-bugs-activos)
2. [Testing](#2-testing)
3. [CI/CD Pipeline](#3-cicd-pipeline)
4. [Seguridad del backend](#4-seguridad-del-backend)
5. [Seguridad del frontend](#5-seguridad-del-frontend)
6. [Docker hardening](#6-docker-hardening)
7. [Monitoreo y observabilidad](#7-monitoreo-y-observabilidad)
8. [TypeScript y calidad de código](#8-typescript-y-calidad-de-código)
9. [Documentación](#9-documentación)
10. [Mejoras opcionales (nice to have)](#10-mejoras-opcionales-nice-to-have)

---

## 1. Configuración de producción (bugs activos)

Estos son problemas que afectan al sistema **ahora mismo**.

---

### 1.1 `WOMPI_ENVIRONMENT` duplicado en `.env.production` `[5min]`

**Qué es:**
En tu `.env.production`, la variable `WOMPI_ENVIRONMENT` aparece dos veces:

```
WOMPI_ENVIRONMENT=production   ← línea 41
WOMPI_ENVIRONMENT=sandbox      ← línea 42 (esta GANA)
```

Docker Compose y Node.js usan la **última definición**. Entonces tu producción está corriendo Wompi en modo **sandbox** (pruebas). Ningún pago real va a funcionar.

**Por qué importa:**
Si un usuario intenta pagar con tarjeta real en producción, Wompi sandbox rechazará la transacción o la tratará como de prueba. Nunca recibirías dinero real.

**Cómo se resuelve:**
Eliminar la línea 42 (`WOMPI_ENVIRONMENT=sandbox`) y dejar solo `WOMPI_ENVIRONMENT=production`. Además, cuando tengas las claves reales de Wompi producción, reemplazar las claves `prv_test_*` y `pub_test_*` por las de producción desde el dashboard de Wompi.

---

### 1.2 Claves Wompi de sandbox en `.env.production` `[5min]`

**Qué es:**
Las claves `WOMPI_PRIVATE_KEY`, `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET` y `WOMPI_EVENTS_SECRET` en tu `.env.production` son las de **sandbox** (todas empiezan con `prv_test_`, `pub_test_`, `test_integrity_`, `test_events_`).

**Por qué importa:**
Incluso si corriges el `WOMPI_ENVIRONMENT` a `production`, las claves de sandbox no funcionarán contra la API real de Wompi. Los pagos fallarán.

**Cómo se resuelve:**
1. Ir a https://dashboard.wompi.co → Desarrolladores → Producción.
2. Copiar las 4 claves de producción (`prv_prod_*`, `pub_prod_*`, etc.).
3. Reemplazarlas en `.env.production`.

---

### 1.3 Secretos compartidos entre `.env.local` y `.env.production` `[15min]`

**Qué es:**
`JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_MASTER_KEY` y `DB_PASSWORD` tienen **exactamente los mismos valores** en ambos archivos.

**Por qué importa:**
Si alguien compromete tu entorno de desarrollo (por ejemplo, un malware en tu PC lee el `.env.local`), automáticamente tiene acceso a producción. Los entornos deben ser **islas independientes**: que caiga uno no afecta al otro.

Además, `ENCRYPTION_MASTER_KEY` se usa para cifrar las credenciales Wompi de cada junta. Si la clave de dev y prod es la misma, un atacante con acceso a dev podría descifrar datos de producción.

**Cómo se resuelve:**
Generar nuevos valores para `.env.local` (o para `.env.production`, lo que prefieras):

```bash
# JWT_SECRET (nuevo para local)
openssl rand -base64 64

# JWT_REFRESH_SECRET (nuevo para local)
openssl rand -base64 64

# ENCRYPTION_MASTER_KEY (nuevo para local)
openssl rand -hex 32

# DB_PASSWORD (nuevo para local)
openssl rand -base64 24
```

> ⚠️ Si ya tienes datos cifrados en producción con la `ENCRYPTION_MASTER_KEY` actual, **NO cambies la clave de producción** — cambia la de local. Cambiar la de producción haría ilegibles los datos ya cifrados.

---

## 2. Testing

El proyecto tiene **esencialmente cero cobertura de tests**. Esto es el gap más grande para un sistema que maneja dinero.

---

### 2.1 Qué es un test y por qué importa en este proyecto `[lectura]`

**Qué es:**
Un test automatizado es código que verifica que otro código funciona correctamente. Hay tres niveles:

- **Test unitario**: prueba una función o servicio aislado. Ejemplo: "¿`DebtService.calcularDeuda()` devuelve $150.000 si el usuario debe 3 meses a $50.000?"
- **Test de integración**: prueba varios componentes juntos. Ejemplo: "¿El endpoint `POST /pagos` crea el pago, actualiza la deuda y registra la auditoría?"
- **Test E2E (end-to-end)**: prueba el flujo completo. Ejemplo: "¿Un usuario puede hacer login, ver su deuda, y completar un pago con Wompi?"

**Por qué importa en JAC App:**
Este sistema maneja pagos, deuda, auditoría legal y cartas oficiales. Sin tests:
- Un cambio en el cálculo de deuda podría cobrar de más o de menos y no te enterarías hasta que un tesorero lo reporte.
- Un refactor en el flujo de pagos podría romper el webhook de Wompi y los pagos online quedarían en limbo.
- Un cambio en los guards podría dar acceso a datos de una junta a usuarios de otra (violación multi-tenant).

---

### 2.2 Crear tests unitarios para servicios de dominio `[1sem]`

**Qué es:**
Tus servicios de dominio (`DebtService`, `PaymentDomainService`, `LetterDomainService`, `RequisitoDomainService`, `AuditDomainService`) contienen la lógica de negocio más crítica y son los más fáciles de testear porque no dependen de NestJS.

**Estado actual:**
Solo existe `app.controller.spec.ts` — el test por defecto de NestJS que verifica "Hello World".

**Cómo se resuelve:**

1. **Crear helpers de testing** — un archivo con mocks de Prisma y utilidades comunes:

```typescript
// apps/backend/src/test-utils/prisma-mock.ts
// Mock del PrismaService para no necesitar una BD real en tests unitarios
```

2. **Empezar por `DebtService`** — es puro cálculo, sin dependencias externas:

```typescript
// apps/backend/src/domain/debt/debt-domain.service.spec.ts
describe('DebtDomainService', () => {
  it('debe calcular deuda correctamente para usuario con 3 meses sin pagar', () => {
    // Arrange: crear datos de prueba (tarifas, historial, pagos)
    // Act: llamar a calcularDeuda()
    // Assert: verificar que el total es correcto
  });

  it('debe retornar deuda 0 para usuario al día', () => { ... });
  it('no debe contar meses donde el usuario estaba inactivo', () => { ... });
});
```

3. **Seguir con `PaymentDomainService`** — validaciones de pago:

```typescript
// Verificar que no se aceptan pagos parciales
// Verificar que el monto coincide con la deuda calculada
// Verificar que pagos duplicados son rechazados
```

4. **Tests para guards** — verificar que la seguridad funciona:

```typescript
// JuntaGuard rechaza peticiones sin juntaId
// RolesGuard rechaza usuarios sin el rol correcto
// PlatformAdminGuard solo permite admins de plataforma
```

**Herramientas que ya tienes:** Jest está configurado en el proyecto. Solo necesitas escribir los tests.

**Comando para correr tests:**

```bash
npm run test --workspace=backend           # unitarios
npm run test:cov --workspace=backend       # unitarios con cobertura
```

---

### 2.3 Crear tests de integración para webhooks `[3d]`

**Qué es:**
Los webhooks de Wompi son endpoints que Wompi llama cuando un pago cambia de estado. Si este endpoint falla silenciosamente, los pagos online quedan en estado pendiente para siempre.

**Cómo se resuelve:**
Crear tests E2E que levanten el módulo de pagos con una BD de prueba:

```typescript
// apps/backend/test/pagos-webhook.e2e-spec.ts
describe('POST /api/pagos/webhook/wompi', () => {
  it('debe procesar un pago aprobado correctamente', async () => {
    // 1. Crear usuario y deuda de prueba en la BD
    // 2. Simular el webhook de Wompi con checksum HMAC válido
    // 3. Verificar que el pago se registró
    // 4. Verificar que la auditoría se creó
  });

  it('debe rechazar webhook con checksum inválido', async () => {
    // Enviar webhook sin el header x-event-checksum correcto
    // Debe retornar 401 o 403
  });

  it('debe ser idempotente (no duplicar pagos)', async () => {
    // Enviar el mismo webhook dos veces
    // Debe procesar solo la primera vez
  });
});
```

---

### 2.4 Configurar coverage threshold `[30min]`

**Qué es:**
Un **coverage threshold** es un porcentaje mínimo de código que debe estar cubierto por tests. Si el porcentaje baja de ese umbral, el build falla.

**Por qué importa:**
Sin umbral, la cobertura puede bajar silenciosamente commit tras commit. Con umbral, cada PR que baje la cobertura será rechazada.

**Cómo se resuelve:**
En `apps/backend/package.json`, dentro de la sección `"jest"`, agregar:

```json
"coverageThreshold": {
  "global": {
    "branches": 50,
    "functions": 50,
    "lines": 50,
    "statements": 50
  },
  "./src/domain/": {
    "branches": 80,
    "functions": 80,
    "lines": 80,
    "statements": 80
  }
}
```

Esto dice: "mínimo 50% global, pero 80% para los servicios de dominio (donde está la lógica financiera)."

También agregar `coveragePathIgnorePatterns` para excluir archivos que no tiene sentido testear:

```json
"coveragePathIgnorePatterns": [
  "/node_modules/",
  "main.ts",
  ".module.ts",
  ".dto.ts",
  ".entity.ts"
]
```

---

### 2.5 Frontend: crear tests para servicios críticos `[3d]`

**Qué es:**
El frontend tiene `skipTests: true` en los schematics de Angular. Eso significa que `ng generate component` no crea archivos `.spec.ts`. Y actualmente hay **cero** tests en el frontend.

**Por qué importa:**
El interceptor JWT maneja refresh de tokens. Si un refactor lo rompe, todos los usuarios pierden sesión. Los guards protegen rutas. Si fallan, usuarios ven páginas que no deberían.

**Cómo se resuelve:**

1. Cambiar `skipTests` a `false` en `angular.json` (para que nuevos componentes se generen con test):

```json
"schematics": {
  "@schematics/angular:component": {
    "skipTests": false
  }
}
```

2. Crear tests mínimos para:
   - `AuthService` — login, logout, refresh, isAuthenticated
   - `jwtInterceptor` — que agrega el header, que maneja 401
   - `authGuard` — que redirige si no está autenticado
   - `permissionGuard` — que bloquea rutas sin permiso

---

## 3. CI/CD Pipeline

Tu pipeline de GitHub Actions solo hace lint y build. No corre tests, no verifica seguridad, y el deploy es manual.

---

### 3.1 Qué es CI/CD `[lectura]`

**CI (Continuous Integration):** Cada vez que haces push o abres un PR, un servidor remoto (GitHub Actions) ejecuta automáticamente: lint, tests, build. Si algo falla, el PR se marca como roto y no se puede mergear.

**CD (Continuous Delivery/Deployment):** Después del CI, el sistema automáticamente construye la imagen Docker, la sube al registry, y opcionalmente la despliega al servidor.

**Por qué importa:**
Sin CI que corra tests, puedes mergear código roto a `main`. Sin CD, cada deploy requiere que tú manualmente hagas SSH, pulls, y rebuilds — lo que es propenso a errores humanos.

---

### 3.2 Agregar ejecución de tests al CI `[1h]`

**Qué es:**
Actualmente tu `.github/workflows/ci.yml` hace lint y build, pero **nunca ejecuta tests**. Incluso si escribes tests, nadie los corre automáticamente.

**Cómo se resuelve:**
Agregar un step entre lint y build en el workflow:

```yaml
      - name: Lint backend
        run: npm run lint --workspace=backend

      # ── AGREGAR ESTO ──
      - name: Test backend
        run: npm run test --workspace=backend -- --coverage --ci
        env:
          DATABASE_URL: postgresql://user:pass@localhost:5432/test
          JWT_SECRET: test-secret-for-ci
          JWT_REFRESH_SECRET: test-refresh-secret-for-ci
          ENCRYPTION_MASTER_KEY: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

      - name: Build backend
        run: npm run build --workspace=backend
```

El flag `--ci` hace que Jest falle si no hay snapshots actualizados y deshabilita el modo watch.

---

### 3.3 Agregar `npm audit` al CI `[30min]`

**Qué es:**
`npm audit` analiza tus dependencias (y las de tus dependencias) buscando **vulnerabilidades de seguridad conocidas**. Cada semana se descubren vulnerabilidades nuevas en paquetes de npm.

**Por qué importa:**
Si una dependencia tiene una vulnerabilidad crítica (por ejemplo, un RCE — Remote Code Execution), un atacante podría tomar control de tu servidor. `npm audit` te avisa antes de que pase.

**Cómo se resuelve:**
Agregar al workflow de CI:

```yaml
      - name: Security audit
        run: npm audit --audit-level=high
```

`--audit-level=high` hace que solo falle en vulnerabilidades altas o críticas (no en las informativas o bajas, que suelen ser ruido).

---

### 3.4 Agregar build de imágenes Docker al CI `[1h]`

**Qué es:**
Actualmente el CI solo verifica que el código compila, pero no que las imágenes Docker se construyen correctamente. Un `Dockerfile` roto no se detecta hasta que intentas hacer deploy.

**Cómo se resuelve:**
Agregar al workflow:

```yaml
      - name: Build Docker images
        run: |
          docker build -t jacapp-backend:ci ./apps/backend
          docker build -t jacapp-frontend:ci ./apps/frontend
```

Esto no sube las imágenes a ningún lado — solo verifica que el build funciona.

---

## 4. Seguridad del backend

Tienes una buena base (helmet, CORS, throttler, validación). Estos son los gaps.

---

### 4.1 Rate limiting en `/bootstrap` `[15min]`

**Qué es:**
El endpoint de bootstrap (`POST /api/bootstrap`) usa un token secreto (`BOOTSTRAP_TOKEN`) para la primera inicialización de una junta. Actualmente **no tiene rate limiting propio** — usa el global de 60 req/min.

**Por qué importa:**
60 intentos por minuto = 3.600 por hora = 86.400 por día. Si un atacante conoce la existencia del endpoint, puede hacer fuerza bruta contra el token. Con un token de 32 bytes base64 es matemáticamente imposible de adivinar, pero **defense in depth** (defensa en profundidad) dice que nunca dependas de una sola capa.

**Qué es "defense in depth":**
Es un principio de seguridad que dice: nunca confíes en una sola protección. Si el token es fuerte PERO el rate limit es bajo, necesitas romper AMBOS para atacar. Si solo tienes el token y un atacante descubre que es débil, no hay segunda barrera.

**Cómo se resuelve:**
En el controller de bootstrap, agregar el decorador `@Throttle`:

```typescript
@Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 intentos por minuto
@Post('bootstrap')
async bootstrap(@Body() dto: BootstrapDto) { ... }
```

---

### 4.2 Rate limiting específico en `/auth/refresh` `[15min]`

**Qué es:**
El endpoint de refresh token usa el límite global (60 req/min). Un refresh token robado podría usarse 60 veces por minuto para generar access tokens.

**Por qué importa:**
Si un atacante roba un refresh token (por ejemplo, via XSS en el frontend), puede mantener acceso indefinido al sistema generando nuevos access tokens. Con rate limiting estricto, limitas el daño.

**Cómo se resuelve:**

```typescript
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 por minuto (más que suficiente para uso normal)
@Post('refresh')
async refresh(@Body() body: RefreshTokenDto) { ... }
```

---

### 4.3 Crear DTO con class-validator para refresh token `[15min]`

**Qué es:**
Cuando el frontend envía un `POST /auth/refresh`, el body contiene `{ refreshToken: "..." }`. Actualmente este body **no pasa por un DTO** validado con class-validator. La validación es manual.

**Por qué importa:**
Sin DTO, el `ValidationPipe` global (con `whitelist: true`) no puede eliminar campos extra que un atacante podría enviar. Un atacante podría enviar `{ refreshToken: "...", admin: true }` y si algún código downstream lee `body.admin`, sería un problema.

**Qué es un DTO:**
DTO = Data Transfer Object. En NestJS, es una clase TypeScript con decoradores de `class-validator` que definen exactamente qué campos son válidos, de qué tipo, y con qué restricciones. El `ValidationPipe` usa estos decoradores para validar automáticamente.

**Cómo se resuelve:**
Crear el DTO:

```typescript
// apps/backend/src/auth/dto/refresh-token.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
```

Y usarlo en el controller:

```typescript
@Post('refresh')
async refresh(@Body() dto: RefreshTokenDto) {
  return this.authService.refreshToken(dto.refreshToken);
}
```

---

### 4.4 Validar `juntaId` en `LoginDto` `[15min]`

**Qué es:**
En tu `LoginDto`, el campo `juntaId` es `@IsOptional()` pero no tiene validación de tipo. Si alguien envía `juntaId: 12345` (número en vez de string) o `juntaId: "<script>alert(1)</script>"`, pasa la validación.

**Por qué importa:**
Aunque Prisma probablemente rechace un valor inválido en la consulta, es mejor fallar temprano y con un mensaje claro. Además, un valor inesperado podría causar errores no controlados que filtren información del sistema.

**Cómo se resuelve:**

```typescript
// En el LoginDto
@IsOptional()
@IsString()
juntaId?: string;
```

Si `juntaId` siempre es un UUID, mejor aún:

```typescript
@IsOptional()
@IsUUID()
juntaId?: string;
```

---

### 4.5 Agregar Request ID a los logs `[1h]`

**Qué es:**
Un **Request ID** (o Correlation ID) es un identificador único que se asigna a cada petición HTTP cuando entra al servidor. Ese ID se incluye en todos los logs generados durante esa petición.

**Por qué importa:**
Imagina este escenario: un usuario reporta "me dio error al pagar". Tú abres los logs del servidor y ves 500 líneas de log de los últimos 5 minutos, de 20 usuarios distintos. ¿Cuáles son del usuario que reportó? Sin Request ID, es casi imposible saberlo.

Con Request ID:
```json
{"requestId": "abc-123", "level": "info", "msg": "POST /api/pagos iniciado", "userId": "usr-456"}
{"requestId": "abc-123", "level": "error", "msg": "Wompi rechazó la transacción", "code": "CARD_DECLINED"}
{"requestId": "abc-123", "level": "info", "msg": "Respondiendo 400 al cliente"}
```

Filtras por `requestId: abc-123` y tienes toda la historia de esa petición.

**Cómo se resuelve:**
Crear un middleware NestJS que genere el ID y lo inyecte:

```typescript
// apps/backend/src/common/middleware/request-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    // Usar el ID que envíe el cliente (para trazabilidad frontend→backend)
    // o generar uno nuevo
    const requestId = req.headers['x-request-id'] || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
```

Luego registrarlo en `AppModule` y usarlo en el logger.

---

### 4.6 Configurar Content Security Policy (CSP) `[1h]`

**Qué es:**
CSP es un header HTTP que le dice al navegador: "solo ejecuta scripts de estos orígenes, solo carga imágenes de estos dominios, solo conecta a estas APIs". Si un atacante logra inyectar HTML/JS (XSS), el navegador **bloquea** la ejecución porque no viene de un origen permitido.

**Por qué importa:**
Sin CSP, si un atacante encuentra un punto de inyección XSS (por ejemplo, un campo que no sanitiza HTML), puede ejecutar JavaScript arbitrario en el navegador de tus usuarios: robar tokens, hacer peticiones como el usuario, etc.

**Cómo se resuelve:**
Hay dos opciones. La más práctica para tu setup es configurar Helmet en el backend:

```typescript
// En main.ts, reemplazar app.use(helmet()) por:
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://*.cloudfront.net"],
        connectSrc: ["'self'", "https://sandbox.wompi.co", "https://production.wompi.co"],
      },
    },
  }),
);
```

> ⚠️ CSP puede romper cosas si es demasiado restrictivo. Hay que probar bien después de configurar. Angular Material usa inline styles, por eso `'unsafe-inline'` en `styleSrc` es necesario.

---

### 4.7 Health check extendido (S3 y Email) `[1h]`

**Qué es:**
Tu health check actual (`/api/health/ready`) solo verifica que PostgreSQL responde. Pero tu app también depende de **AWS S3** (documentos) y **AWS SES** (emails).

**Por qué importa:**
Si SES está caído, los usuarios no reciben emails de recuperación de contraseña ni notificaciones. Si S3 está caído, no se pueden subir ni ver documentos. Pero tu monitoreo (Uptime Kuma) solo ve que el health check dice "OK" porque la BD sí responde.

**Cómo se resuelve:**
Agregar verificaciones opcionales al readiness check:

```typescript
@Get('ready')
async readiness() {
  const checks: Record<string, string> = {};

  // Base de datos (ya existente)
  try {
    await this.prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  // S3 (verificar que el bucket existe y es accesible)
  try {
    await this.s3.headBucket({ Bucket: process.env.AWS_S3_BUCKET_NAME });
    checks.s3 = 'ok';
  } catch {
    checks.s3 = 'error';
  }

  const allOk = Object.values(checks).every(v => v === 'ok');
  return { status: allOk ? 'ok' : 'degraded', checks };
}
```

`degraded` significa "funciona, pero no al 100%". Uptime Kuma puede alertarte si ve `degraded`.

---

## 5. Seguridad del frontend

---

### 5.1 Crear un `ErrorHandler` global `[1h]`

**Qué es:**
Angular tiene un mecanismo llamado `ErrorHandler` que captura **todos los errores no controlados** de la aplicación: errores en templates, en observables sin `catchError`, en promesas sin `.catch()`, etc.

**Estado actual:**
No tienes un `ErrorHandler` personalizado. Los errores se pierden en la consola del navegador. No sabes cuándo ni cuánto fallan tus usuarios.

**Por qué importa:**
Un error no controlado puede dejar un componente en estado inconsistente — por ejemplo, un botón de "Pagar" que se queda en estado "cargando" para siempre. Sin ErrorHandler, no te enteras.

**Cómo se resuelve:**

```typescript
// apps/frontend/src/app/core/global-error-handler.ts
import { ErrorHandler, Injectable, NgZone } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(
    private snackBar: MatSnackBar,
    private zone: NgZone,
  ) {}

  handleError(error: unknown): void {
    // Loguear siempre
    console.error('Error no controlado:', error);

    // Mostrar mensaje al usuario
    this.zone.run(() => {
      this.snackBar.open(
        'Ocurrió un error inesperado. Intenta de nuevo.',
        'Cerrar',
        { duration: 5000 },
      );
    });

    // En el futuro: enviar a Sentry
    // Sentry.captureException(error);
  }
}
```

Registrarlo en `app.config.ts`:

```typescript
providers: [
  { provide: ErrorHandler, useClass: GlobalErrorHandler },
  // ... otros providers
]
```

---

### 5.2 Proteger ruta `usuarios/:id` con guard `[30min]`

**Qué es:**
La ruta `/app/usuarios/:id` no tiene un guard de permisos propio. Solo hereda el `authGuard` del padre `/app`. Cualquier usuario autenticado puede navegar a `/app/usuarios/cualquier-id`.

**Por qué importa:**
Aunque el **backend** filtra por `juntaId` (un usuario de la Junta A no puede ver datos de la Junta B), un afiliado común podría intentar navegar a `/app/usuarios/id-de-otro-usuario` dentro de su misma junta y ver información que no le corresponde.

**Cómo se resuelve:**
Agregar un guard que verifique que el usuario tiene permiso para ver ese perfil (es admin, secretaria, tesorera, o es su propio perfil):

```typescript
// En las rutas
{
  path: 'usuarios/:id',
  loadComponent: () => import('./usuarios/...'),
  canActivate: [authGuard, usuarioDetalleGuard],
}
```

---

### 5.3 Condición de carrera en el interceptor JWT `[1h]`

**Qué es:**
Cuando el access token expira, tu `jwtInterceptor` intercepta el error 401 e intenta hacer un refresh. El problema: si hay **5 peticiones simultáneas** y todas reciben 401, las 5 van a intentar hacer refresh al mismo tiempo. Solo la primera debería hacer refresh; las otras deberían esperar.

**Por qué importa:**
5 refresh simultáneos significan 5 llamadas al backend, y las últimas 4 usarán un refresh token que ya fue consumido (si el backend rota el refresh token, como es la práctica recomendada). Resultado: el usuario es deslogueado inesperadamente.

**Cómo se resuelve:**
Implementar un patrón de "cola de refresh":

```typescript
// En el interceptor
private isRefreshing = false;
private refreshSubject = new BehaviorSubject<string | null>(null);

// Cuando llega un 401:
if (!this.isRefreshing) {
  this.isRefreshing = true;
  this.refreshSubject.next(null);

  return this.authService.refresh().pipe(
    tap(token => {
      this.isRefreshing = false;
      this.refreshSubject.next(token);
    }),
    switchMap(token => {
      // Reintentar la petición original con el nuevo token
      return next(addToken(req, token));
    }),
  );
} else {
  // Esperar a que termine el refresh en curso
  return this.refreshSubject.pipe(
    filter(token => token !== null),
    take(1),
    switchMap(token => next(addToken(req, token))),
  );
}
```

---

### 5.4 Configurar `withFetch()` en HttpClient `[5min]`

**Qué es:**
Angular 17+ puede usar la **Fetch API** del navegador en lugar del viejo `XMLHttpRequest` (XHR) para las peticiones HTTP. Fetch es más moderno, más rápido en algunos escenarios, y es el estándar web actual.

**Estado actual:**
Tu `app.config.ts` usa `provideHttpClient(withInterceptors([jwtInterceptor]))` sin `withFetch()`, entonces Angular usa XHR.

**Cómo se resuelve:**

```typescript
// app.config.ts
provideHttpClient(
  withFetch(),
  withInterceptors([jwtInterceptor]),
)
```

> ⚠️ Verificar que los interceptores funcionan correctamente con Fetch después del cambio. En la gran mayoría de casos funciona igual.

---

### 5.5 Fijar versiones de dependencias (sin `^`) `[30min]`

**Qué es:**
En tu `package.json` del frontend, las dependencias usan `^19.2.0`. El `^` (caret) significa "acepta cualquier versión compatible" — en la práctica, `^19.2.0` acepta `19.2.0`, `19.2.1`, `19.3.0`, etc.

**Por qué importa:**
Si hoy haces `npm install` y mañana también, podrías obtener versiones distintas si se publicó un patch entre medio. Esto puede causar bugs que "funcionan en mi máquina pero no en CI" o viceversa.

**Aclaración importante:**
El `package-lock.json` **sí** fija las versiones exactas. Mientras uses `npm ci` (que respeta el lockfile), no hay problema. El riesgo es si alguien hace `npm install` (que puede actualizar el lockfile) o si eliminan el lockfile.

**Cómo se resuelve:**
Opción A (recomendada): Asegurarte de que siempre se use `npm ci` y que el `package-lock.json` esté en git. Ya lo estás haciendo en CI.

Opción B (más estricta): Configurar npm para no usar caret por defecto:

```bash
npm config set save-exact true
```

---

## 6. Docker hardening

"Hardening" significa endurecer la configuración de seguridad. Tu setup Docker funciona bien, pero puede ser más seguro.

---

### 6.1 Nginx como usuario no-root `[30min]`

**Qué es:**
Tu contenedor frontend usa `nginx:1.27-alpine`. Por defecto, nginx corre como **root** dentro del contenedor. Si un atacante encuentra una vulnerabilidad en nginx, obtiene acceso root al contenedor.

**Por qué importa:**
Con root, un atacante podría: leer archivos del contenedor, intentar escapar al host (container escape), o acceder a la red interna Docker donde está PostgreSQL.

**Cómo se resuelve:**
Opción A: Usar la imagen oficial unprivileged:

```dockerfile
# En apps/frontend/Dockerfile, cambiar:
FROM nginx:1.27-alpine
# Por:
FROM nginxinc/nginx-unprivileged:1.27-alpine
```

Y ajustar el puerto (esta imagen usa 8080 en vez de 80):

```dockerfile
EXPOSE 8080
```

Opción B: Crear un usuario en el Dockerfile actual:

```dockerfile
RUN addgroup -S nginx-user && adduser -S nginx-user -G nginx-user
RUN chown -R nginx-user:nginx-user /var/cache/nginx /var/log/nginx /etc/nginx/conf.d
RUN touch /var/run/nginx.pid && chown nginx-user:nginx-user /var/run/nginx.pid
USER nginx-user
```

---

### 6.2 Agregar `security_opt: no-new-privileges` `[15min]`

**Qué es:**
`no-new-privileges` es una opción de seguridad de Linux que impide que un proceso **escale privilegios** después de arrancar. Incluso si un binario tiene el bit `setuid`, no podrá obtener más privilegios de los que tenía al inicio.

**Por qué importa:**
Si un atacante logra ejecutar código dentro de un contenedor, no podrá usar técnicas de escalación de privilegios para obtener más permisos.

**Cómo se resuelve:**
En `docker-compose.yml`, agregar a **todos** los servicios:

```yaml
services:
  backend:
    security_opt:
      - no-new-privileges:true
    # ... resto de config

  frontend:
    security_opt:
      - no-new-privileges:true

  postgres:
    security_opt:
      - no-new-privileges:true

  caddy:
    security_opt:
      - no-new-privileges:true
```

---

### 6.3 Agregar límites de recursos `[15min]`

**Qué es:**
Los límites de recursos (`mem_limit`, `cpus`) dictan cuánta memoria y CPU puede usar cada contenedor. Sin límites, un contenedor con un memory leak o un proceso desbocado puede consumir toda la RAM del VPS y tumbar **todos** los servicios.

**Por qué importa:**
En un VPS de 2GB (el setup típico para empezar), si el backend tiene un memory leak y consume 1.8GB, PostgreSQL se queda sin memoria y la BD se corrompe.

**Cómo se resuelve:**
En `docker-compose.yml` (o en el override de producción):

```yaml
services:
  postgres:
    mem_limit: 512m
    cpus: '0.5'

  backend:
    mem_limit: 512m
    cpus: '1.0'

  frontend:
    mem_limit: 128m
    cpus: '0.25'

  caddy:
    mem_limit: 128m
    cpus: '0.25'
```

Estos valores son para un VPS de 2GB. Ajustar según tu servidor.

---

### 6.4 Agregar healthcheck a Caddy `[15min]`

**Qué es:**
Caddy es tu reverse proxy — el punto de entrada a toda la aplicación. Si Caddy muere, todo deja de funcionar. Pero no tiene healthcheck, entonces Docker no sabe si está vivo.

**Por qué importa:**
Sin healthcheck, Docker no reinicia Caddy automáticamente si se congela (un proceso congelado no es lo mismo que un proceso muerto — `restart: unless-stopped` solo actúa si el proceso **muere**).

**Cómo se resuelve:**

```yaml
caddy:
  healthcheck:
    test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:80/"]
    interval: 30s
    timeout: 5s
    retries: 3
    start_period: 15s
```

---

### 6.5 Timeout en entrypoint de backend `[15min]`

**Qué es:**
Tu `entrypoint.sh` del backend espera a que PostgreSQL esté listo con un bucle:

```bash
while ! pg_isready ...; do sleep 2; done
```

Si PostgreSQL nunca arranca (por ejemplo, disco lleno), este bucle corre **para siempre**.

**Cómo se resuelve:**
Agregar un contador de intentos:

```bash
MAX_RETRIES=30
RETRY_COUNT=0

while ! node -e "...check postgres..."; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "ERROR: PostgreSQL no respondió después de $MAX_RETRIES intentos"
    exit 1
  fi
  echo "Esperando PostgreSQL... intento $RETRY_COUNT/$MAX_RETRIES"
  sleep 2
done
```

30 intentos × 2 segundos = 1 minuto máximo de espera.

---

### 6.6 Fijar tags de imágenes `[5min]`

**Qué es:**
En `docker-compose.monitoring.yml`, usas `dpage/pgadmin4:latest` y `louislam/uptime-kuma:1`. El tag `latest` cambia con cada release — no sabes qué versión estás corriendo.

**Cómo se resuelve:**
Fijar a versiones específicas:

```yaml
pgadmin:
  image: dpage/pgadmin4:8.14  # en vez de :latest

uptime-kuma:
  image: louislam/uptime-kuma:1.23.15  # versión específica
```

---

## 7. Monitoreo y observabilidad

Tienes lo básico (logs JSON, Uptime Kuma), pero falta mucho para operar un SaaS con confianza.

---

### 7.1 Qué es observabilidad y por qué importa `[lectura]`

**Observabilidad** tiene tres pilares:

1. **Logs**: Registro textual de lo que pasa ("usuario X hizo login", "pago Y falló").
2. **Métricas**: Números sobre el estado del sistema (CPU al 80%, 50 requests/segundo, 2% de errores 5xx).
3. **Traces**: El camino completo de una petición a través del sistema (frontend → Caddy → backend → Prisma → PostgreSQL).

Con solo logs (que es lo que tienes), puedes investigar **después** de que algo falla. Con métricas, puedes **predecir** fallas (la memoria sube 5% al día, en 10 días se acaba). Con traces, puedes ver **dónde** se tarda una petición lenta.

---

### 7.2 Configurar Sentry (error tracking) `[1d]`

**Qué es:**
Sentry es un servicio que captura errores de tu aplicación (backend y frontend), los agrupa, te notifica, y te muestra el stack trace completo con el contexto (qué usuario, qué petición, qué navegador).

**Por qué importa:**
Sin Sentry, solo sabes que hay un error si: (a) un usuario te llama, o (b) tú abres los logs del servidor y buscas. Sentry te envía un email/Slack/Telegram automáticamente cuando ocurre un error nuevo.

El **tier gratuito** de Sentry permite 5.000 eventos/mes — más que suficiente para empezar.

**Cómo se resuelve:**

1. Crear cuenta en https://sentry.io
2. Crear dos proyectos: uno para NestJS, otro para Angular.

Backend:

```bash
cd apps/backend
npm install @sentry/nestjs @sentry/profiling-node
```

```typescript
// instrument.ts (antes de cualquier import)
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% de requests para performance
});
```

Frontend:

```bash
cd apps/frontend
npm install @sentry/angular
```

```typescript
// main.ts
import * as Sentry from '@sentry/angular';

Sentry.init({
  dsn: environment.sentryDsn,
  environment: environment.production ? 'production' : 'development',
});
```

---

### 7.3 Configurar alertas en Uptime Kuma `[1h]`

**Qué es:**
Uptime Kuma puede monitorear URLs y alertarte si están caídas. Ya tienes Uptime Kuma en `docker-compose.monitoring.yml`, pero necesitas configurar los monitores y las notificaciones.

**Cómo se resuelve:**

1. Acceder a Uptime Kuma (puerto 3001).
2. Crear monitores:
   - **Frontend**: `https://jacapp.online` — verifica que la landing carga.
   - **Backend liveness**: `https://jacapp.online/api/health/live` — verifica que NestJS está vivo.
   - **Backend readiness**: `https://jacapp.online/api/health/ready` — verifica que la BD responde.
3. Configurar notificaciones:
   - Email (si SES ya funciona).
   - Telegram (gratuito, instantáneo — recomendado).
   - Webhook a Discord/Slack si usas alguno.

---

### 7.4 Considerar métricas con Prometheus + Grafana `[2d]` `[futuro]`

**Qué es:**
- **Prometheus**: sistema que recolecta métricas numéricas de tus servicios cada X segundos.
- **Grafana**: dashboard visual donde ves gráficas de esas métricas.

**Cuándo implementarlo:**
No es urgente. Cuando tengas 3+ juntas usando el sistema y necesites saber: "¿cuánta memoria usa cada junta?", "¿cuántas peticiones hay por hora?", "¿cuánto tarda el cálculo de deuda?".

**Qué implica:**
NestJS tiene el paquete `@willsoto/nestjs-prometheus` que expone métricas automáticas (requests, latencia, errores) en `/metrics`. Prometheus las raspa y Grafana las grafica.

---

## 8. TypeScript y calidad de código

---

### 8.1 Activar `noImplicitAny` en el backend `[3d]`

**Qué es:**
`noImplicitAny: false` en `tsconfig.json` del backend permite que TypeScript infiera el tipo `any` cuando no puede determinar el tipo real. `any` desactiva **toda** la verificación de tipos.

**Ejemplo del problema:**

```typescript
function processPayment(data) {
  // TypeScript infiere data: any
  // No te avisa si haces data.amounnt (typo)
  // No te avisa si haces data.amount.toFixed() y amount es string
  return data.amounnt; // ← bug silencioso
}
```

Con `noImplicitAny: true`:

```typescript
function processPayment(data) {
  // ERROR: Parameter 'data' implicitly has an 'any' type
  // Te obliga a definir el tipo:
}

function processPayment(data: PaymentData) {
  return data.amounnt; // ERROR: Property 'amounnt' does not exist
}
```

**Por qué importa:**
En un sistema financiero, un typo en un nombre de campo puede causar que un cálculo devuelva `undefined` en vez de un número, y `undefined * 50000 = NaN`, y NaN se guarda en un log o se muestra como deuda.

**Cómo se resuelve gradualmente:**

1. Activar `noImplicitAny: true` en `tsconfig.json`.
2. Correr `npm run build --workspace=backend` y ver cuántos errores salen.
3. Corregirlos archivo por archivo, empezando por `domain/` (lógica de negocio).
4. Si son demasiados, puedes usar la estrategia de **error allowlist**: activar la regla pero ignorar temporalmente los archivos existentes y solo exigirla en código nuevo.

---

### 8.2 Activar `strictBindCallApply` y `noFallthroughCasesInSwitch` `[1h]`

**Qué es:**

- `strictBindCallApply: true` — verifica que cuando usas `.bind()`, `.call()` o `.apply()` los argumentos sean del tipo correcto.
- `noFallthroughCasesInSwitch: true` — te obliga a poner `break` o `return` en cada `case` de un `switch`. Sin esto, el código "cae" al siguiente case silenciosamente.

**Ejemplo de fallthrough peligroso:**

```typescript
switch (userRole) {
  case 'AFILIADO':
    permissions = basicPermissions;
    // ← falta break! cae al siguiente case
  case 'ADMIN':
    permissions = adminPermissions; // ← un AFILIADO recibe permisos de ADMIN
    break;
}
```

**Cómo se resuelve:**
En `apps/backend/tsconfig.json`:

```json
"strictBindCallApply": true,
"noFallthroughCasesInSwitch": true
```

---

## 9. Documentación

---

### 9.1 Crear `README.md` en la raíz `[1h]`

**Qué es:**
El README es la puerta de entrada al proyecto. Es lo primero que ve alguien en GitHub, lo primero que lee un nuevo desarrollador, y lo primero que tú mismo leerás cuando vuelvas al proyecto después de 3 meses.

**Contenido mínimo:**

```markdown
# JAC App

Sistema digital para Juntas de Acción Comunal en Colombia.

## Quick Start (desarrollo)
1. Clonar el repo
2. cp .env.local.example .env.local
3. docker compose -f docker-compose.yml -f docker-compose.dev.yml up
4. Acceder a http://localhost

## Arquitectura
- Backend: NestJS + Prisma + PostgreSQL
- Frontend: Angular 19 + Angular Material + Tailwind
- Infraestructura: Docker + Caddy (HTTPS)

## Documentación
- [Setup completo](docs/SETUP.md)
- [Despliegue](docs/DESPLIEGUE.md)
- [Backups](docs/BACKUP_RESTORE.md)
- [Arquitectura](docs/00_ARQUITECTURA_RECTOR%20copy.md)

## Scripts útiles
- `npm run dev` — levantar todo en desarrollo
- `npm run build` — compilar backend y frontend
- `./scripts/backup-db.sh` — backup de base de datos
```

---

## 10. Mejoras opcionales (nice to have)

Estas no son bloqueantes, pero elevan la calidad del proyecto.

---

### 10.1 CSRF Protection `[1d]`

**Qué es:**
CSRF (Cross-Site Request Forgery) es un ataque donde un sitio malicioso hace que el navegador del usuario envíe una petición a tu API usando las cookies de sesión del usuario, sin su consentimiento.

**Por qué puede no ser urgente:**
Tu app usa tokens JWT en `sessionStorage`, no cookies `httpOnly`. CSRF es principalmente un problema con cookies. Pero si en el futuro migras a httpOnly cookies (que es más seguro contra XSS), necesitarás CSRF protection.

**Cómo se resuelve:**
Angular tiene soporte nativo con `withXsrfProtection()`. El backend debe enviar un cookie `XSRF-TOKEN` y Angular automáticamente lo envía como header `X-XSRF-TOKEN`.

---

### 10.2 Service Worker con `dataGroups` para API `[1h]`

**Qué es:**
Tu PWA (Service Worker) cachea assets estáticos, pero no respuestas de API. Esto significa que si el usuario pierde conexión momentáneamente, la app no puede mostrar datos previamente cargados.

**Cuidado:**
Para datos sensibles (pagos, deuda), **no** deberías cachear. Pero datos como la lista de juntas, el nombre del usuario, o avisos, sí podrían cachearse brevemente.

---

### 10.3 Pre-commit hooks con Husky `[1h]`

**Qué es:**
Un pre-commit hook es un script que se ejecuta automáticamente **antes** de cada commit. Puede correr lint, formatear código, o ejecutar tests rápidos.

**Por qué importa:**
Evita que se hagan commits con errores de lint o código sin formatear. Es una barrera local antes de que el código llegue a CI.

**Cómo se resuelve:**

```bash
npm install husky lint-staged --save-dev
npx husky init
```

```json
// package.json
"lint-staged": {
  "apps/backend/src/**/*.ts": ["eslint --fix"],
  "apps/frontend/src/**/*.ts": ["eslint --fix"]
}
```

---

### 10.4 Filesystem read-only en contenedores `[30min]`

**Qué es:**
`read_only: true` en Docker hace que el filesystem del contenedor sea de solo lectura. Si un atacante compromete el contenedor, no puede escribir archivos (backdoors, scripts maliciosos).

**Cómo se resuelve:**

```yaml
backend:
  read_only: true
  tmpfs:
    - /tmp  # Para archivos temporales que NestJS pueda necesitar
```

Requiere verificar que tu app no escribe en el filesystem (lo cual es correcto — deberías escribir en S3 o en la BD, nunca en disco local).

---

## Resumen de prioridades

### Hacer AHORA (antes de cualquier usuario real)

| # | Ítem | Sección | Esfuerzo | Estado |
|---|------|---------|----------|--------|
| 1 | Corregir `WOMPI_ENVIRONMENT` duplicado | 1.1 | 5min | ✅ |
| 2 | Reemplazar claves Wompi sandbox por producción | 1.2 | 5min | ⏳ (sandbox intencional para pruebas de flujo) |
| 3 | Secretos distintos por entorno | 1.3 | 15min | ✅ |
| 4 | Rate limit en bootstrap | 4.1 | 15min | ✅ |
| 5 | Rate limit en refresh | 4.2 | 15min | ✅ |
| 6 | DTO para refresh token | 4.3 | 15min | ✅ |
| 7 | Validar juntaId en LoginDto | 4.4 | 15min | ✅ |
| 8 | ErrorHandler global en Angular | 5.1 | 1h | ✅ |

### Hacer en la primera semana

| # | Ítem | Sección | Esfuerzo | Estado |
|---|------|---------|----------|--------|
| 9 | Tests para servicios de dominio | 2.2 | 1sem | ✅ (49 tests, domain 100% coverage) |
| 10 | Configurar Sentry | 7.2 | 1d | |
| 11 | Agregar tests al CI | 3.2 | 1h | ✅ |
| 12 | Request ID en logs | 4.5 | 1h | ✅ |
| 13 | CSP con Helmet | 4.6 | 1h | ✅ |
| 14 | README.md | 9.1 | 1h | ✅ |

### Hacer en el primer mes

| # | Ítem | Sección | Esfuerzo | Estado |
|---|------|---------|----------|--------|
| 15 | Nginx no-root | 6.1 | 30min | ✅ |
| 16 | `no-new-privileges` en Docker | 6.2 | 15min | ✅ |
| 17 | Límites de recursos Docker | 6.3 | 15min | ✅ |
| 18 | Healthcheck Caddy | 6.4 | 15min | ✅ |
| 19 | Timeout en entrypoint | 6.5 | 15min | ✅ |
| 20 | `strict: true` (incluye noImplicitAny) | 8.1 | 3d | ✅ |
| 21 | Tests webhook Wompi | 2.3 | 3d | ✅ (PagosService 36 + WompiService 15) |
| 22 | Coverage threshold | 2.4 | 30min | ✅ |
| 23 | Guard en `usuarios/:id` | 5.2 | 30min | ✅ |
| 24 | Race condition interceptor JWT | 5.3 | 1h | ✅ |
| 25 | Alertas Uptime Kuma | 7.3 | 1h | |
| 26 | `npm audit` en CI | 3.3 | 30min | ✅ |
| 27 | Health check extendido (S3, SES) | 4.7 | 1h | ✅ |
| 28 | `strictBindCallApply` + `noFallthroughCasesInSwitch` | 8.2 | 1h | ✅ |
| 29 | Fijar tags de imágenes | 6.6 | 5min | ✅ |
| 30 | Docker build en CI | 3.4 | 1h | ✅ |
| 31 | Tests frontend | 2.5 | 3d | ✅ (AuthService 66 tests) |
| 32 | `withFetch()` en Angular | 5.4 | 5min | ✅ |

### Futuro (cuando haya usuarios reales)

| # | Ítem | Sección | Esfuerzo | Estado |
|---|------|---------|----------|--------|
| 33 | Prometheus + Grafana | 7.4 | 2d | |
| 34 | CSRF Protection | 10.1 | 1d | |
| 35 | SW dataGroups | 10.2 | 1h | ✅ |
| 36 | Pre-commit hooks (Husky) | 10.3 | 1h | ✅ (lint-staged + jest) |
| 37 | Read-only filesystem | 10.4 | 30min | ✅ |
| 38 | Corregir 375 errores de lint | 8.3 | 2h | ✅ (0 errores, ESLint config tests) |
