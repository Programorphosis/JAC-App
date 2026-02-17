# Roadmap PA-5 – Motor de Límites, Cuotas y Planes Personalizados

**Plan de referencia:** `Motor de Límites, Cuotas y Planes Personalizados.md`  
**Dependencia:** PA-4 (Suscripciones y Planes) – ya implementado

---

## Resumen ejecutivo

| Fase | Objetivo | Estado |
|------|----------|--------|
| PA5-0 | Enriquecer modelo Plan y Suscripción | Pendiente |
| PA5-1 | Storage real (Documento.sizeBytes) | Pendiente |
| PA5-2 | Refactor LimitesService (overrides, ilimitados, vencimiento) | Pendiente |
| PA5-3 | Integrar validación en upload documentos | Pendiente |
| PA5-4 | Política de vencimiento y bloqueo | Pendiente |
| PA5-5 | Frontend: límites efectivos y alertas mejoradas | Pendiente |

---

## Estado actual (línea base)

| Componente | Ubicación | Estado |
|------------|-----------|--------|
| Plan | `prisma/schema.prisma` | limiteUsuarios, limiteStorageMb, limiteCartasMes (null=ilimitado). Sin flags explícitos ni descripcion |
| Suscripcion | `prisma/schema.prisma` | juntaId, planId, fechas, estado. Sin overrides |
| Documento | `prisma/schema.prisma` | Sin sizeBytes |
| LimitesService | `infrastructure/limits/limites.service.ts` | validarCrearUsuario, validarEmitirCarta, validarStorage. Solo lee Plan |
| UsersService | `application/users/users.service.ts` | Integrado |
| Cartas | `application/cartas/cartas.controller.ts` | Integrado |
| DocumentosService | `application/documentos/documentos.service.ts` | **No integrado** |
| Alertas | `GET /api/platform/juntas/:id/alertas` | Existe |
| junta-detail | `platform/junta-detail/` | Muestra uso y alertas; usa plan directo |

---

## Fase PA5-0: Enriquecer modelo Plan y Suscripción

**Objetivo:** Schema alineado al plan SaaS flexible.

### 0.1 Migración Plan

```prisma
// Campos a añadir en Plan
descripcion              String?
permiteUsuariosIlimitados  Boolean @default(false)
permiteStorageIlimitado    Boolean @default(false)
permiteCartasIlimitadas    Boolean @default(false)
esPersonalizable         Boolean @default(false)
```

**Regla de migración:** Planes existentes con `limiteX = null` → `permiteXIlimitado = true` (mantener semántica actual).

### 0.2 Migración Suscripción

```prisma
// Campos a añadir en Suscripcion
overrideLimiteUsuarios    Int?
overrideLimiteStorageMb   Int?
overrideLimiteCartasMes   Int?
esPlanPersonalizado       Boolean @default(false)
precioPersonalizado       Decimal?
motivoPersonalizacion     String?
fechaCreacion             DateTime @default(now())
```

### 0.3 Seed planes de ejemplo (opcional)

| Plan | Usuarios | Storage | Cartas | Precio |
|------|----------|---------|--------|--------|
| Básico | 100 | 500 MB | 50/mes | $ |
| Estándar | 300 | 2 GB | 200/mes | $$ |
| Premium | Ilimitado | 10 GB | Ilimitado | $$$ |
| Social | 50 | 200 MB | 20/mes | Bajo |

---

## Fase PA5-1: Storage real (Documento.sizeBytes)

**Objetivo:** Calcular uso de storage en MB reales, no por count.

### 1.1 Migración Documento

```prisma
sizeBytes  BigInt?  // tamaño real del archivo en bytes
```

### 1.2 Modificar upload

- **Archivo:** `application/documentos/documentos.service.ts`
- Al subir: obtener `file.size` (o `buffer.byteLength`), guardar en `sizeBytes`
- Documentos existentes: `sizeBytes = null` (tratar como desconocido; excluir del SUM o estimar)

### 1.3 Cálculo de uso

- `getUsoActual`: en lugar de `documentosCount`, calcular `SUM(sizeBytes)` agrupado por junta (vía `usuario.juntaId`)
- Convertir a MB: `bytes / 1024 / 1024`

---

## Fase PA5-2: Refactor LimitesService

**Objetivo:** Límites efectivos = override ?? plan, con soporte ilimitados y estado vencido.

### 2.1 Nuevo método `getLimitesEfectivos(juntaId)`

```typescript
// Lógica
limiteUsuarios = suscripcion.overrideLimiteUsuarios ?? plan.limiteUsuarios
if (plan.permiteUsuariosIlimitados) limiteUsuarios = Infinity
// Idem storage y cartas
```

### 2.2 Reemplazar `getPlanLimites` por `getLimitesEfectivos`

- Usar en validaciones y alertas
- Considerar estado: si `estado === 'VENCIDA'` y política = bloqueo parcial, lanzar `SuscripcionVencida`

### 2.3 Errores de dominio

- Crear `LimiteUsuariosExcedido`, `LimiteCartasExcedido`, `LimiteStorageExcedido`, `SuscripcionVencida` en `domain/errors`
- LimitesService lanza estos en lugar de `ForbiddenException` genérico (opcional; mantener ForbiddenException con mensaje específico también es válido)

### 2.4 Política de vencimiento

- Definir en config o constante: `VENCIMIENTO_POLICY = 'BLOQUEO_PARCIAL'`
- Si VENCIDA: bloquear crear usuario, emitir carta, subir documento; permitir consultas

---

## Fase PA5-3: Integrar validación en upload documentos

**Objetivo:** DocumentosService valide storage antes de subir.

### 3.1 Inyectar LimitesService en DocumentosService

- Añadir `LimitesModule` a imports de `DocumentosModule`
- Antes de `prisma.documento.create`, llamar `limites.validarStorage(juntaId, sizeBytes)` o `validarSubirDocumento(juntaId, sizeBytes)`

### 3.2 Ajustar `validarStorage` / nuevo `canUploadDocument`

- Recibir `sizeBytes` del archivo a subir
- Uso actual en MB + (sizeBytes / 1024 / 1024) <= limiteStorageMb

---

## Fase PA5-4: Política de vencimiento

**Objetivo:** Juntas con suscripción VENCIDA bloqueadas según política.

### 4.1 En LimitesService.getLimitesEfectivos

- Si `suscripcion.estado === 'VENCIDA'` y política = BLOQUEO_PARCIAL → retornar null o lanzar en validaciones
- Validaciones (`validarCrearUsuario`, etc.) deben fallar con mensaje claro

### 4.2 Opcional: bloqueo en login

- Si junta tiene suscripción VENCIDA y política = BLOQUEO_TOTAL, rechazar login (evaluar si aplica)

---

## Fase PA5-5: Frontend – límites efectivos y alertas

**Objetivo:** UI use límites efectivos (con overrides) y muestre niveles 80% / 95% / 100%.

### 5.1 API: incluir límites efectivos en respuesta

- `GET /platform/juntas/:id` o `/uso` puede incluir `limitesEfectivos: { usuarios, storage, cartas }`
- O `GET /platform/juntas/:id/alertas` ya retorna actual/limite; asegurar que limite sea el efectivo

### 5.2 junta-uso-card

- Usar límites efectivos (desde API) en lugar de `junta.suscripcion.plan.limiteX`
- Si plan es ilimitado, mostrar "Ilimitado" o ocultar barra

### 5.3 junta-info-card / alertas

- Niveles: 80% Advertencia, 95% Crítico, 100% Bloqueo
- Colores dinámicos

### 5.4 junta-suscripcion-card

- Mostrar indicador "Plan personalizado" si `esPlanPersonalizado`
- Mostrar overrides si existen

### 5.5 Dashboard plataforma

- Widget: juntas cercanas a límite
- Widget: juntas vencidas

---

## Orden de ejecución recomendado

```
PA5-0 (Schema) → PA5-1 (Storage) → PA5-2 (LimitesService) → PA5-3 (Documentos) → PA5-4 (Vencimiento) → PA5-5 (Frontend)
```

**Bloques paralelizables:** PA5-4 puede integrarse dentro de PA5-2. PA5-5 depende de que la API devuelva límites efectivos (PA5-2).

---

## Criterio de cierre PA-5

- [ ] Plan y Suscripción con campos nuevos (migración aplicada)
- [ ] Documento.sizeBytes; upload guarda tamaño real
- [ ] LimitesService usa overrides e ilimitados
- [ ] DocumentosService valida antes de subir
- [ ] Suscripción VENCIDA bloquea según política
- [ ] Frontend muestra límites efectivos y alertas mejoradas
- [ ] Plan personalizado operativo (override en suscripción)

---

## Referencias

- `Motor de Límites, Cuotas y Planes Personalizados.md` – Plan detallado
- `ROADMAP_ADMINISTRADOR_PLATAFORMA.md` – PA-5 en contexto general
- `PLAN_ADMINISTRADOR_PLATAFORMA.md` – Visión plataforma
