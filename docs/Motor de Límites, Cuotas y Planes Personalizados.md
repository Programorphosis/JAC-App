# PA-5 – Motor de Límites, Cuotas y Planes Personalizados

| Campo | Valor |
|-------|-------|
| **Versión** | 2.0 |
| **Reemplaza** | PA-5 original en `ROADMAP_ADMINISTRADOR_PLATAFORMA.md` |
| **Dependencia** | PA-4 – Suscripciones y Planes |
| **Principio** | Modelo SaaS flexible, auditable y preparado para planes personalizados |
| **Roadmap** | `ROADMAP_PA5_LIMITES.md` |

---

## Estado actual del proyecto

Antes de implementar el plan completo, este es el estado real del código:

| Componente | Estado | Detalle |
|------------|--------|---------|
| **Plan** | Parcial | Tiene `limiteUsuarios`, `limiteStorageMb`, `limiteCartasMes` (null = ilimitado). Falta: flags ilimitados, `descripcion`, `esPersonalizable` |
| **Suscripcion** | Parcial | Tiene `estado` (ACTIVA, PRUEBA, SUSPENDIDA, VENCIDA, CANCELADA). Falta: overrides, `esPlanPersonalizado`, `precioPersonalizado` |
| **Documento** | Incompleto | No tiene `sizeBytes`. Storage se calcula por *count* de documentos (1 doc ≈ 1 MB), no por bytes reales |
| **LimitesService** | Existe | `validarCrearUsuario`, `validarEmitirCarta`, `validarStorage`. Solo lee de Plan, no soporta overrides ni ilimitados. No valida estado VENCIDA |
| **UsersService** | Integrado | Llama `validarCrearUsuario` antes de crear |
| **Cartas** | Integrado | Llama `validarEmitirCarta` antes de emitir |
| **DocumentosService** | No integrado | No llama `validarStorage` antes de subir |
| **GET /alertas** | Existe | `GET /api/platform/juntas/:id/alertas` |
| **Frontend** | Parcial | junta-detail muestra uso y alertas; barras de progreso usan límites del plan directamente (sin overrides) |

---

## Tabla de contenidos

1. [Objetivo](#1-objetivo)
2. [Problema detectado](#2-problema-detectado-en-versión-anterior)
3. [Principios del modelo](#3-principios-del-nuevo-modelo)
4. [Modelo de datos](#4-modelo-de-datos-requerido)
5. [Resolución de límites efectivos](#5-resolución-de-límites-efectivos)
6. [Cálculo de uso real](#6-cálculo-de-uso-real)
7. [LimitesService](#7-limiteservice-servicio-central)
8. [Política de vencimiento](#8-política-de-vencimiento-de-suscripción)
9. [Sistema de alertas](#9-sistema-de-alertas)
10. [Integraciones obligatorias](#10-integraciones-obligatorias)
11. [Frontend](#11-frontend)
12. [Criterio de cierre](#12-criterio-de-cierre)
13. [Orden de implementación](#13-orden-interno-recomendado)
14. [Resultado esperado](#14-resultado-esperado)

---

## 1. Objetivo

Implementar un **Motor Centralizado de Límites SaaS** que:

- Valide límites por plan antes de operaciones críticas
- Soporte planes estándar, ilimitados y personalizados
- Permita overrides por junta sin duplicar planes
- Calcule uso real (usuarios, cartas, storage)
- Genere alertas progresivas
- Permita bloqueo configurable según estado de suscripción

---

## 2. Problema detectado en versión anterior

La definición original de PA-5 asumía:

| Limitación | Impacto |
|------------|---------|
| Límites rígidos | Sin flexibilidad comercial |
| Planes sin variaciones | Deuda técnica |
| Sin soporte para ilimitados | Casos edge no cubiertos |
| Sin soporte para personalización comercial | Rigidez en ventas |
| Sin cálculo real de storage | Métricas inexactas |
| Sin estrategia ante vencimiento | Riesgo operativo |

> Esto genera deuda técnica y rigidez comercial.

---

## 3. Principios del nuevo modelo

| Concepto | Definición |
|----------|------------|
| **Plan** | Plantilla comercial reutilizable |
| **Suscripción** | Instancia real del acuerdo con la junta |
| **Límites efectivos** | Se calculan dinámicamente (override → plan → ilimitado) |
| **Ilimitados** | Explícitos mediante flags booleanos |
| **Validación** | Centralizada en `LimitesService` |
| **Módulos funcionales** | No validan límites directamente; delegan en `LimitesService` |

---

## 4. Modelo de datos requerido

### 4.1 Plan (plantilla comercial)

```prisma
model Plan {
  id              String   @id @default(uuid())
  nombre          String   @unique
  descripcion     String?
  precioMensual   Int      // COP
  precioAnual     Int      // COP

  limiteUsuarios    Int?     @default(null)
  limiteStorageMb   Int?     @default(null)
  limiteCartasMes   Int?     @default(null)

  permiteUsuariosIlimitados  Boolean @default(false)
  permiteStorageIlimitado    Boolean @default(false)
  permiteCartasIlimitadas    Boolean @default(false)

  esPersonalizable  Boolean @default(false)
  activo           Boolean @default(true)
  fechaCreacion    DateTime @default(now())

  suscripciones    Suscripcion[]
}
```

**Reglas:**

- Si `permiteUsuariosIlimitados = true` → ignorar `limiteUsuarios`
- Si límite es `null` y flag es `false` → se considera **0** (no permitido)
- Plan no debe modificarse retroactivamente si tiene suscripciones activas (opcional: versionado futuro)

---

### 4.2 Suscripción (instancia de negocio)

```prisma
model Suscripcion {
  id                String   @id @default(uuid())
  juntaId           String   @unique
  planId            String

  fechaInicio       DateTime
  fechaVencimiento  DateTime

  estado            EstadoSuscripcion @default(PRUEBA)
  // ACTIVA | PRUEBA | SUSPENDIDA | VENCIDA | CANCELADA

  overrideLimiteUsuarios    Int?
  overrideLimiteStorageMb   Int?
  overrideLimiteCartasMes   Int?

  esPlanPersonalizado      Boolean  @default(false)
  precioPersonalizado      Decimal?
  motivoPersonalizacion    String?

  fechaCreacion            DateTime @default(now())

  junta    Junta @relation(...)
  plan     Plan  @relation(...)
}
```

---

## 5. Resolución de límites efectivos

El sistema calcula el límite real así:

```
limiteUsuariosReal =
  suscripcion.overrideLimiteUsuarios
  ?? plan.limiteUsuarios
```

**Excepción:** Si `plan.permiteUsuariosIlimitados == true` → `limiteUsuariosReal = ∞`

Misma lógica para **storage** y **cartas**.

---

## 6. Cálculo de uso real

### 6.1 Usuarios

```sql
SELECT COUNT(*) FROM Usuario WHERE juntaId = ?
```

### 6.2 Cartas del mes

```sql
SELECT COUNT(*) FROM Carta
WHERE juntaId = ?
  AND estado = 'APROBADA'
  AND EXTRACT(MONTH FROM fechaEmision) = mesActual
  AND EXTRACT(YEAR FROM fechaEmision) = anioActual
```

### 6.3 Storage real

**Cambio en modelo `Documento`:**

```prisma
model Documento {
  // ... campos existentes (usuarioId, tipo, rutaS3, ...) ...
  sizeBytes  BigInt?  // tamaño real del archivo en bytes
}
```

> **Nota:** `Documento` no tiene `juntaId`; se obtiene vía `usuario.juntaId`. La agregación es `SUM(sizeBytes)` donde `usuario.juntaId = ?`.

**Flujo al subir archivo:**

1. Obtener tamaño real del archivo (`file.size` o `buffer.byteLength`)
2. Guardarlo en BD al crear el registro
3. Calcular uso: `SUM(sizeBytes)` por junta (vía `usuario.juntaId`)
4. Convertir a MB: `storageMb = bytes / 1024 / 1024`

---

## 7. LimitesService (servicio central)

### 7.1 Responsabilidades

| Método | Descripción |
|--------|-------------|
| `canCreateUser(juntaId)` | Valida si puede crear usuario |
| `canEmitLetter(juntaId)` | Valida si puede emitir carta |
| `canUploadDocument(juntaId, sizeBytes)` | Valida si puede subir documento |
| `getUsoActual(juntaId)` | Retorna uso actual por dimensión |
| `getLimitesEfectivos(juntaId)` | Retorna límites efectivos |
| `getAlertas(juntaId)` | Retorna alertas por dimensión |

### 7.2 Reglas

- **Nunca** validar límites directamente en `UsersService` o `LetterService`
- **Siempre** llamar a `LimitesService` antes de operación crítica
- Lanzar errores de dominio específicos:

| Error | Cuándo |
|-------|--------|
| `LimiteUsuariosExcedido` | Usuarios >= límite |
| `LimiteCartasExcedido` | Cartas del mes >= límite |
| `LimiteStorageExcedido` | Storage actual + nuevo archivo > límite |
| `SuscripcionVencida` | Suscripción en estado VENCIDA según política |

---

## 8. Política de vencimiento de suscripción

Definir explícitamente una de estas estrategias:

| Opción | Comportamiento |
|--------|----------------|
| **B – Bloqueo parcial** *(recomendado)* | Permite consulta; bloquea crear usuarios, emitir cartas, subir documentos |


> ⚠️ Se recomienda **Opción B** para balance comercial.

---

## 9. Sistema de alertas

### Niveles progresivos

| Uso | Estado |
|-----|--------|
| 80% | Advertencia |
| 95% | Crítico |
| 100% | Bloqueo |

### Endpoint

```
GET /api/platform/juntas/:id/alertas
```

### Respuesta ejemplo

```json
{
  "usuarios": {
    "uso": 82,
    "limite": 100,
    "nivel": "ADVERTENCIA"
  },
  "storage": {
    "uso": 480,
    "limite": 500,
    "nivel": "CRITICO"
  },
  "cartas": {
    "uso": 49,
    "limite": 50,
    "nivel": "CRITICO"
  }
}
```

---

## 10. Integraciones obligatorias

| Módulo | Integración |
|--------|-------------|
| `UsersService.create` | Llamar `LimitesService.canCreateUser` antes de crear |
| `LetterService.emitLetter` | Llamar `LimitesService.canEmitLetter` antes de emitir |
| Upload de documentos | Llamar `LimitesService.canUploadDocument` antes de subir |
| `PaymentService` *(opcional)* | Bloquear pagos en junta vencida si se define |

---

## 11. Frontend

### 11.1 Detalle de junta

- Barra de progreso por límite (usuarios, storage, cartas)
- Colores dinámicos según nivel (verde / amarillo / rojo)
- Indicador de plan personalizado
- Estado de suscripción visible

### 11.2 Dashboard plataforma

- Alertas de juntas cercanas a límite
- Juntas vencidas
- Juntas con plan personalizado

---

## 12. Criterio de cierre

PA-5 se considera completo cuando:

- [x] `LimitesService` implementado *(base existente)*
- [x] Validaciones en UsersService y Cartas
- [ ] Validación en upload de documentos
- [ ] Storage real calculado (`Documento.sizeBytes`) – hoy usa count como proxy
- [ ] Overrides por suscripción funcionando
- [x] Alertas visibles en detalle junta *(endpoint y frontend existen)*
- [ ] Junta vencida bloquea según política definida
- [ ] Plan personalizado operativo (overrides sin crear nuevo Plan)
- [ ] Flags ilimitados en Plan

---

## 13. Orden interno recomendado

Ver `ROADMAP_PA5_LIMITES.md` para el plan detallado. Resumen:

```
1. Migración Prisma (Plan + Suscripción extendidos)
2. Migración Documento.sizeBytes
3. Refactor LimitesService (overrides, ilimitados, política vencimiento)
4. Integrar validarStorage en DocumentosService
5. Ajustar frontend para límites efectivos
6. Pruebas y cierre
```

---

## 14. Resultado esperado

El sistema queda:

- **Comercialmente flexible** – planes estándar, ilimitados y personalizados
- **Técnicamente limpio** – validación centralizada, sin duplicación
- **Escalable** – preparado para SaaS real
- **Sin duplicación de planes** – overrides en suscripción
- **Sin deuda futura** – personalización sin crear nuevos planes
