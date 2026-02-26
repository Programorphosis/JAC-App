# Análisis: Crons y múltiples instancias

**Fecha:** 2026-02-25  
**Objetivo:** Evaluar el riesgo de duplicación de crons al escalar el backend y proponer soluciones.

---

## 1. Estado actual

### 1.1 Arquitectura de crons

El backend usa `@nestjs/schedule` con `ScheduleModule.forRoot()`. Los crons se ejecutan **en cada proceso** que arranca la aplicación.

| Servicio | Cron | Horario | Acción |
|----------|------|---------|--------|
| **FacturasCronService** | `handleFacturasRenovacion` | 00:00 diario | Genera facturas de renovación (7 días antes de vencimiento) |
| **FacturasCronService** | `handleMarcarVencidas` | 00:01 diario | Marca facturas vencidas |
| **FacturasCronService** | `handleFacturasOverridesMensuales` | 00:02 día 1 | Genera facturas de overrides mensuales |
| **FacturasCronService** | `handleMarcarSuscripcionesVencidas` | 00:05 diario | Marca suscripciones vencidas, envía emails |
| **FacturasCronService** | `handleNotificacionesVencimientoProximo` | 09:00 diario | Notifica vencimiento en 1 y 3 días |
| **RequisitosCronService** | `handleMonthlyCutoff` | 00:00 día 1 | Corte mensual: AL_DIA → MORA en requisitos |
| **WompiReconciliationCronService** | `handleReconciliation` | 02:00 diario | Reconciliación Wompi (registra pagos faltantes) |

### 1.2 Despliegue actual

En `docker-compose.yml` hay **una sola instancia** del backend:

```yaml
backend:
  container_name: jac-backend
  # Sin replicas
```

**Conclusión:** Con el despliegue actual (1 contenedor backend), **no hay duplicación**. Cada cron corre una sola vez.

---

## 2. Riesgo al escalar

Si en el futuro se añaden réplicas (por ejemplo, para balanceo de carga):

```yaml
backend:
  deploy:
    replicas: 3
```

o con Kubernetes:

```yaml
replicas: 3
```

**Cada instancia ejecutará todos los crons.** Con 3 instancias, cada job correría 3 veces.

### 2.1 Impacto por tipo de cron

| Cron | Riesgo de duplicación | Consecuencia |
|------|-----------------------|--------------|
| **Facturas renovación** | Alto | Facturas duplicadas para la misma suscripción |
| **Facturas vencidas** | Medio | Múltiples actualizaciones del mismo registro (idempotente si es UPDATE) |
| **Overrides mensuales** | Alto | Facturas de overrides duplicadas |
| **Suscripciones vencidas** | Medio | Múltiples emails a la misma junta; múltiples UPDATE |
| **Notificaciones vencimiento** | Medio | Emails duplicados (1 y 3 días) |
| **Corte requisitos** | Alto | HistorialRequisito duplicado; posible doble paso a MORA |
| **Reconciliación Wompi** | Alto | Posible registro duplicado de pagos |

### 2.2 Documentación existente

En `consecutivosYCronJobs.md` §2.4 ya se menciona:

> Los jobs deben ejecutarse **una sola vez** por ejecución (evitar múltiples instancias del backend ejecutando el mismo job).
>
> En producción con múltiples réplicas: considerar un lock distribuido (Redis) o ejecutar jobs solo en una instancia designada.
>
> Para MVP con un solo contenedor backend: no hay problema de duplicación.

---

## 3. Opciones de solución

### 3.1 Opción A: Variable de entorno (instancia designada)

**Idea:** Solo una instancia tiene `CRON_ENABLED=true`. Las demás tienen `CRON_ENABLED=false` y no registran los crons.

**Implementación:**
- Añadir `CRON_ENABLED` (default: `true` para compatibilidad).
- Usar `SchedulerRegistry` para registrar/desregistrar crons según la variable.
- O envolver cada handler en `if (process.env.CRON_ENABLED === 'true')`.

**Pros:**
- Muy simple.
- Sin dependencias nuevas.
- Fácil de configurar en K8s (solo un pod con la variable).

**Contras:**
- Requiere configuración explícita por instancia.
- Si la instancia con crons cae, no hay failover automático.

---

### 3.2 Opción B: Lock con PostgreSQL (advisory lock)

**Idea:** Antes de ejecutar cada cron, intentar adquirir un lock en PostgreSQL. Solo quien lo consiga ejecuta.

**Implementación:**
- Usar `pg_try_advisory_lock(bigint)` vía Prisma `$queryRaw`.
- Convertir el nombre del job a un bigint (ej. hash del string).
- Si el lock se adquiere → ejecutar; si no → salir.
- Liberar el lock al terminar (o al cerrar la conexión).

**Pros:**
- No requiere Redis.
- PostgreSQL ya está en el stack.
- Failover: si una instancia cae, el lock se libera al cerrar la conexión.

**Contras:**
- Usa una conexión de Prisma durante la ejecución del cron.
- Hay que asegurar liberación correcta (try/finally).

**Ejemplo conceptual:**
```typescript
// cron-lock.service.ts
async withCronLock(jobName: string, fn: () => Promise<void>) {
  const lockId = hashToBigint(`cron:${jobName}`);
  const acquired = await this.prisma.$queryRaw`SELECT pg_try_advisory_lock(${lockId}) as ok`;
  if (!acquired[0]?.ok) return; // Otro proceso tiene el lock
  try {
    await fn();
  } finally {
    await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${lockId})`;
  }
}
```

---

### 3.3 Opción C: Lock con Redis

**Idea:** Igual que B, pero usando Redis (SET key NX EX ttl).

**Pros:**
- Muy rápido.
- TTL evita locks huérfanos.
- Patrón muy usado (Redlock, etc.).

**Contras:**
- Requiere Redis en el stack.
- Nueva dependencia e infraestructura.

---

### 3.4 Opción D: Scheduler externo + endpoints

**Idea:** Los crons no corren dentro del backend. Un cron del sistema (o un servicio externo) llama a endpoints HTTP protegidos.

**Implementación:**
- Endpoints `POST /internal/cron/facturas-renovacion`, etc.
- Protegidos por API key o red interna.
- Crontab en el servidor o un job en K8s CronJob.

**Pros:**
- Un solo punto de ejecución.
- Separación clara entre API y jobs.

**Contras:**
- Más componentes que mantener.
- Requiere exponer endpoints internos de forma segura.

---

## 4. Recomendación

| Escenario | Recomendación |
|-----------|---------------|
| **Actual (1 instancia)** | No hacer nada. |
| **Escalado próximo (2–5 instancias)** | **Opción B (PostgreSQL advisory lock)**. Sin Redis, usa lo que ya hay. |
| **Escalado mayor + Redis ya en stack** | **Opción C (Redis lock)**. Mejor rendimiento si Redis está disponible. |
| **Arquitectura con scheduler externo** | **Opción D**. Si se usa K8s CronJob o similar. |

---

## 5. Plan de implementación (cuando se escale)

1. Crear `CronLockService` con método `withLock(jobName, fn)`.
2. Envolver cada handler de cron en `this.cronLock.withLock('nombre-job', async () => { ... })`.
3. Usar advisory lock de PostgreSQL (opción B) como primera implementación.
4. Probar con 2 réplicas y verificar que cada cron corre una sola vez.
5. Documentar en `consecutivosYCronJobs.md` la solución adoptada.

---

## 6. Referencias

- `consecutivosYCronJobs.md` §2.4
- [Managing Cron Jobs with NestJS - Multi-Instance](https://dev.to/femresirvan/managing-cron-jobs-with-nestjs-solving-multi-instance-issues-and-locking-mechanisms-51co)
- [PostgreSQL Advisory Locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)
- [advisory-lock npm](https://www.npmjs.com/package/advisory-lock)
