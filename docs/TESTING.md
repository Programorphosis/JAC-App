# Estrategia de Testing – JAC App

## Filosofía

> Testear lo que duele: autenticación, permisos, pagos, cálculos financieros, webhooks.
> Lo que no se testea, se rompe en producción.

---

## 1. Tipos de tests

| Tipo | Alcance | Herramienta | Ubicación |
|------|---------|-------------|-----------|
| **Unitario** | Función/clase aislada, mocks manuales | Jest | `*.spec.ts` junto al archivo |
| **Integración** | Módulo NestJS con Prisma mock | Jest + `@nestjs/testing` | `*.spec.ts` junto al archivo |
| **E2E** | HTTP real contra app levantada | Jest + `supertest` | `test/*.e2e-spec.ts` |

---

## 2. Convenciones

- Archivo de test: mismo nombre + `.spec.ts` al lado del archivo fuente.
- Usar `describe` por clase/función y `it` por caso.
- Nombres de test en español: `'debe rechazar si el usuario no está autenticado'`.
- Mocks: preferir mocks manuales sobre `jest.mock()` global. Inyectar dependencias como objetos con `jest.fn()`.
- No testear implementación interna, testear comportamiento observable.

---

## 3. Inventario por capa y prioridad

### 3.1 Capa de Dominio (✅ Completada – 49 tests)

| Archivo | Tests | Cobertura |
|---------|-------|-----------|
| `domain/services/debt.service.ts` | 8 | 100% |
| `domain/services/payment.service.ts` | 6 | 100% |
| `domain/services/letter.service.ts` | 10 | 100% |
| `domain/services/requisito.service.ts` | 11 | 100% |
| `domain/services/audit.service.ts` | 2 | 100% |
| `domain/helpers/carta-pago-validation.helper.ts` | 10 | 100% |

### 3.2 Auth – Guards (✅ Completada – 33 tests)

| Archivo | Qué testear | Prioridad |
|---------|-------------|-----------|
| `auth/guards/junta.guard.ts` | Sin user, user sin juntaId, user con juntaId | Crítica |
| `auth/guards/roles.guard.ts` | Sin roles requeridos, con rol correcto, sin rol | Crítica |
| `auth/guards/platform-admin.guard.ts` | PLATFORM_ADMIN con juntaId null, otro rol | Crítica |
| `auth/guards/usuario-propio-o-admin.guard.ts` | Propio, ADMIN, SECRETARIA, TESORERA, FISCAL, modificador, sin permiso | Crítica |
| `auth/guards/modificador-o-admin.guard.ts` | ADMIN, modificador, sin permiso | Crítica |
| `auth/guards/modificador-solo.guard.ts` | Modificador con junta, sin modificador | Crítica |
| `auth/guards/impersonacion-salir.guard.ts` | Con impersonando=true, sin impersonación | Crítica |

### 3.3 Auth – Permisos (✅ Completada – 32 tests)

| Archivo | Qué testear | Prioridad |
|---------|-------------|-----------|
| `auth/permission.service.ts` | Cada método × cada rol (ADMIN, SECRETARIA, TESORERA, FISCAL, AFILIADO, modificador) | Crítica |
| `auth/permissions-from-roles.ts` | `computePermissions` para cada rol, `computePermissionsForImpersonation` | Crítica |

### 3.4 Common – Filtros y utilidades (✅ Completada – 30 tests)

| Archivo | Qué testear | Prioridad |
|---------|-------------|-----------|
| `common/filters/domain-exception.filter.ts` | HttpException, DomainError con cada código, Error genérico | Alta |
| `common/utils/validacion-telefono.util.ts` | Formatos válidos, inválidos, normalización E.164 | Alta |
| `common/utils/suscripcion-fechas.util.ts` | Días de prueba, mensual, anual, estado suscripción | Alta |

### 3.5 Infrastructure – Encriptación (✅ Completada – 9 tests)

| Archivo | Qué testear | Prioridad |
|---------|-------------|-----------|
| `infrastructure/encryption/encryption.service.ts` | Round-trip encrypt/decrypt, clave inválida, ciphertext corrupto | Crítica |

### 3.6 Webhooks (✅ Completada – 11 tests)

| Archivo | Qué testear | Prioridad |
|---------|-------------|-----------|
| `application/webhooks/webhooks.controller.ts` | Checksum válido/inválido, eventos ignorados, idempotencia, rama junta vs factura | Crítica |

### 3.7 Application Services (siguiente iteración)

| Archivo | Qué testear | Prioridad |
|---------|-------------|-----------|
| `application/pagos/pagos.service.ts` | Pago efectivo, pago online, idempotencia, usuario inactivo | Crítica |
| `application/cartas/cartas.service.ts` | Solicitar carta, requisitos, deuda, vigencia | Alta |
| `application/requisitos/requisitos.service.ts` | CRUD, estado, obligación, modificador | Alta |
| `application/requisitos/requisitos-cron.service.ts` | Corte mensual automático | Alta |
| `application/users/users.service.ts` | Crear usuario, roles únicos, historial inicial | Media |
| `application/bootstrap/bootstrap.service.ts` | Ejecutar bootstrap, ya ejecutado | Media |
| `application/historial-laboral/historial-laboral.service.ts` | Crear historial, solapamiento | Media |
| `application/estado-general/estado-general.service.ts` | Consolidar estado general | Media |
| `application/documentos/documentos.service.ts` | Subir, listar, descargar | Media |
| `application/junta/junta.service.ts` | Crear junta | Media |
| `application/tarifas/tarifas.service.ts` | Crear tarifa, auditoría | Normal |
| `application/avisos-junta/avisos-junta.service.ts` | CRUD avisos | Normal |
| `application/mi-junta/mi-junta.service.ts` | Wompi, suscripción, límites | Normal |
| `application/wompi-reconciliation/wompi-reconciliation.service.ts` | Reconciliación de intenciones | Normal |

### 3.8 Infrastructure Runners (siguiente iteración)

| Archivo | Qué testear | Prioridad |
|---------|-------------|-----------|
| `infrastructure/payment/payment-registration-runner.service.ts` | Transacción serializable, idempotencia | Alta |
| `infrastructure/letter/letter-emission-runner.service.ts` | Emisión de carta dentro de transacción | Alta |
| `infrastructure/requisito/requisito-operation-runner.service.ts` | Instanciación de RequisitoService | Media |
| `infrastructure/storage/s3-storage.service.ts` | Validación de archivos, MIME types | Media |
| `infrastructure/email/email.service.ts` | Transport disabled, envío | Baja |
| `infrastructure/limits/limites.service.ts` | Overrides, ilimitados, vencida | Alta |

### 3.9 Platform (siguiente iteración)

| Archivo | Qué testear | Prioridad |
|---------|-------------|-----------|
| `platform/facturas/platform-facturas.service.ts` | Facturación, pago de factura | Alta |
| `platform/facturas/facturas-cron.service.ts` | Renovación, vencimiento automático | Alta |
| `platform/juntas/platform-juntas.service.ts` | CRUD juntas, credenciales Wompi | Media |
| `platform/dashboard/platform-dashboard.service.ts` | Métricas | Baja |

### 3.10 Health Check

| Archivo | Qué testear | Prioridad |
|---------|-------------|-----------|
| `health/health.controller.ts` | Liveness, readiness con DB activa y caída | Baja |

---

## 4. Cómo ejecutar

```bash
# Todos los tests
cd apps/backend && npx jest

# Un archivo específico
npx jest --testPathPattern="auth/guards"

# Con coverage
npx jest --coverage

# Solo domain
npx jest --testPathPattern="domain/"

# Watch mode
npx jest --watch
```

---

## 5. Metas de cobertura

| Capa | Meta mínima | Meta ideal |
|------|-------------|------------|
| `domain/` | 100% | 100% |
| `auth/guards/` | 100% | 100% |
| `auth/permission*` | 100% | 100% |
| `common/` | 90% | 100% |
| `application/` | 80% | 90% |
| `infrastructure/` | 70% | 85% |
| `platform/` | 60% | 80% |

---

## 6. Patrones de mock

### Mock de ExecutionContext (para guards)

```typescript
function createMockContext(user?: Partial<JwtUser>, params?: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, params: params ?? {} }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}
```

### Mock de PrismaService

```typescript
const mockPrisma = {
  usuario: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
  junta: { findUnique: jest.fn() },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
};
```

### Mock de ArgumentsHost (para filtros)

```typescript
function createMockHost(): ArgumentsHost {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
}
```

---

## 7. CI/CD

- **GitHub Actions**: ejecutar `npx jest --ci --coverage` en el pipeline.
- **Umbral mínimo**: configurar `coverageThreshold` en `jest.config` cuando se alcance 60% global.
- **Reporte**: subir `coverage/lcov.info` como artefacto.

---

## 8. Errores conocidos en tests

### `instanceof DomainError` con subclases

`DomainError` usa `Object.setPrototypeOf(this, DomainError.prototype)` lo que rompe `instanceof` para subclases en Jest. **Solución**: assertar por mensaje en vez de constructor:

```typescript
// MAL
await expect(fn()).rejects.toThrow(DeudaCeroError);

// BIEN
await expect(fn()).rejects.toThrow('ya está al día');
```

### Fechas y timezone

`new Date('YYYY-MM-DD')` crea en UTC; `getMonth()` usa timezone local. **Solución**: usar helper `localDate(y, m, d)`:

```typescript
function localDate(y: number, m: number, d: number) {
  return new Date(y, m - 1, d);
}
```
