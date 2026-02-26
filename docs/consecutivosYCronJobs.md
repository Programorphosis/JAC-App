# Consecutivos y Cron Jobs – Sistema JAC

**Versión:** 1.0  
**Objetivo:** Definir la lógica de consecutivos por tipo y la ejecución de jobs programados.

---

## 1. Consecutivos por Tipo

### 1.1 Tabla Consecutivo (Schema)

```
Consecutivo: id, juntaId, tipo, anio, valorActual
@@unique([juntaId, tipo, anio])
```

### 1.2 Tipos de Consecutivo

| Tipo | Uso | Reinicio |
|------|-----|----------|
| PAGO_JUNTA | Consecutivo de pagos tipo JUNTA por junta/año | Anual |
| PAGO_CARTA | Consecutivo de pagos tipo CARTA por junta/año | Anual |
| CARTA | Consecutivo de cartas emitidas por junta/año | Anual |

Cada tipo tiene su propia secuencia por junta y año. El valor se incrementa con cada uso.

### 1.3 Lógica de Obtención

**Recomendación:** Función atómica dentro de transacción:

1. Buscar o crear registro `Consecutivo` para `(juntaId, tipo, anio)`.
2. Si no existe: crear con `valorActual = 1`, retornar 1.
3. Si existe: `UPDATE ... SET valorActual = valorActual + 1 RETURNING valorActual`.
4. Usar el valor retornado como consecutivo del Pago o Carta.
5. Todo dentro de la misma transacción donde se crea el Pago/Carta para evitar condiciones de carrera.

### 1.4 Ejemplo (Pseudocódigo)

```typescript
async function obtenerConsecutivo(tx, juntaId: string, tipo: string): Promise<number> {
  const anio = new Date().getFullYear();
  const existente = await tx.consecutivo.findUnique({
    where: { juntaId_tipo_anio: { juntaId, tipo, anio } }
  });
  if (!existente) {
    await tx.consecutivo.create({
      data: { juntaId, tipo, anio, valorActual: 1 }
    });
    return 1;
  }
  const actualizado = await tx.consecutivo.update({
    where: { id: existente.id },
    data: { valorActual: { increment: 1 } }
  });
  return actualizado.valorActual;
}
```

### 1.5 Uso por Entidad

- **Pago:** Al crear Pago, obtener consecutivo según `tipo` (PAGO_JUNTA o PAGO_CARTA).
- **Carta:** Al aprobar carta, obtener consecutivo tipo CARTA.

---

## 2. Cron Jobs

### 2.1 Jobs del Sistema

| Job | Frecuencia | Responsable | Descripción |
|-----|------------|-------------|-------------|
| Corte requisitos (MORA) | Día 1 de cada mes | RequisitoService.applyMonthlyCutoff | Por cada RequisitoTipo con tieneCorteAutomatico=true: pasar a MORA a usuarios con obligacionActiva=true y estado=AL_DIA |
| Reconciliación Wompi | Diario (nocturno) | PaymentService / Job dedicado | Comparar transacciones APPROVED en Wompi vs pagos en BD; registrar faltantes |

### 2.2 Recomendación: node-cron dentro del Backend

**Enfoque:** Ejecutar los cron jobs dentro del proceso NestJS usando `@nestjs/schedule` (que usa node-cron internamente).

**Ventajas:**
- Un solo proceso para API y jobs.
- Acceso directo a servicios de dominio (RequisitoService, etc.).
- Configuración en código, versionada.
- En Docker: un contenedor backend ejecuta todo.

**Configuración:**

```typescript
// app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ...
  ],
})
export class AppModule {}
```

```typescript
// requisitos.cron.ts
@Injectable()
export class RequisitosCronService {
  constructor(private requisitoService: RequisitoService) {}

  @Cron('0 0 1 * *') // Día 1 de cada mes a las 00:00
  async handleMonthlyCutoff() {
    await this.requisitoService.applyMonthlyCutoff();
  }
}
```

```typescript
// wompi-reconciliation.cron.ts
@Injectable()
export class WompiReconciliationCron {
  @Cron('0 2 * * *') // Todos los días a las 02:00
  async handleReconciliation() {
    await this.reconciliationService.runDailyReconciliation();
  }
}
```

### 2.3 Alternativa: Cron del Sistema (Linux)

Si se prefiere separar los jobs del proceso API:

- Crear endpoints internos (protegidos por API key o red interna): `POST /internal/cron/requisitos-cutoff`, `POST /internal/cron/wompi-reconcile`.
- Configurar crontab en el servidor:
  ```
  0 0 1 * * curl -X POST -H "X-Internal-Key: secret" http://localhost:3000/internal/cron/requisitos-cutoff
  0 2 * * * curl -X POST -H "X-Internal-Key: secret" http://localhost:3000/internal/cron/wompi-reconcile
  ```

**Recomendación:** Para MVP, `@nestjs/schedule` es más simple y suficiente. Si en el futuro se requiere mayor resiliencia (ej. jobs en servidor separado), se puede migrar a cron del sistema o a un worker dedicado.

### 2.4 Consideraciones

- Los jobs deben ejecutarse **una sola vez** por ejecución (evitar múltiples instancias del backend ejecutando el mismo job).
- En producción con múltiples réplicas: considerar un lock distribuido (Redis) o ejecutar jobs solo en una instancia designada.
- Para MVP con un solo contenedor backend: no hay problema de duplicación.

**Análisis detallado:** Ver `CRON_MULTI_INSTANCIA_ANALISIS.md` para estado actual, impacto al escalar y opciones de implementación (PostgreSQL advisory lock, Redis, variable de entorno).

---

**Referencias:** `flujoRequisitosAdicionales.md`, `flujoDePagosCasoFallaWebhook.md`, `definicionDomainServices.md`, `SCHEMA BASE v1.md`.
