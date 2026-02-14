# Requisitos adicionales dinámicos

**Documento oficial** – Reemplaza `flujoReceptorDeAgua.md`  
Alineado al modelo Prisma de requisitos adicionales por junta.

---

## 1. Propósito

El sistema de requisitos adicionales gestiona estados administrativos configurables por junta. Cada junta puede tener cero, uno o varios requisitos (agua, basura, etc.) que actúan como filtros para la validación de la carta laboral.

- No procesa dinero de requisitos
- No guarda pagos de requisitos
- Mantiene estado oficial (AL_DIA / MORA) por requisito y usuario
- Permite corte automático mensual (solo para requisitos con `tieneCorteAutomatico=true`)
- Permite excepción mediante `obligacionActiva`
- El permiso de actualización viene de `modificadorId` del RequisitoTipo (no del rol)

---

## 2. Modelo oficial

### RequisitoTipo

Define un requisito configurable por junta.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| juntaId | UUID | FK Junta |
| nombre | String | Ej: "agua", "basura" |
| modificadorId | UUID? | Usuario autorizado a actualizar estado (null = nadie asignado) |
| tieneCorteAutomatico | Boolean | Si true, el cron día 1 aplica MORA a usuarios con obligacionActiva |
| activo | Boolean | Requisito activo para la junta |
| fechaCreacion | DateTime | |

### EstadoRequisito

Estado actual de un usuario para un requisito. PK compuesta (usuarioId, requisitoTipoId).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| usuarioId | UUID | FK Usuario |
| requisitoTipoId | UUID | FK RequisitoTipo |
| estado | AL_DIA \| MORA | Estado administrativo |
| obligacionActiva | Boolean | true = debe cumplir; false = exento |
| fechaUltimoCambio | DateTime | |

### HistorialRequisito

Registro inmutable de cada cambio.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| usuarioId | UUID | |
| requisitoTipoId | UUID | |
| tipoCambio | ESTADO \| OBLIGACION | |
| estadoAnterior, estadoNuevo | Enum? | |
| obligacionAnterior, obligacionNueva | Boolean? | |
| cambiadoPorId | UUID? | null si cambio automático |
| cambioAutomatico | Boolean | |
| fechaCambio | DateTime | |

---

## 3. Multi-tenant

- RequisitoTipo tiene `juntaId` directo.
- EstadoRequisito e HistorialRequisito se filtran vía `requisitoTipo.juntaId` o `usuario.juntaId`.
- Toda consulta debe incluir filtro por junta.

---

## 4. Permisos

| Acción | Quién puede |
|--------|-------------|
| Actualizar estado (AL_DIA/MORA) | Usuario con `usuarioId === modificadorId` del RequisitoTipo O rol ADMIN |
| Cambiar obligación (exento) | Solo ADMIN |
| CRUD RequisitoTipo | Solo ADMIN |

El rol RECEPTOR_AGUA se mantiene por compatibilidad con bootstrap/usuarios existentes. En el nuevo modelo, el permiso viene de `modificadorId`. ADMIN puede asignar cualquier usuario como modificador.

---

## 5. Flujo manual (actualización de estado)

**Escenario:** Usuario cumple el requisito (ej. paga agua fuera del sistema).

1. Modificador valida manualmente.
2. Modificador marca AL_DIA.

**Endpoint:** `POST /usuarios/:id/requisitos/:requisitoTipoId/estado`  
Body: `{ estado: "AL_DIA" }`

**Lógica:**
- Validar que el actor sea `modificadorId` del RequisitoTipo o ADMIN.
- Validar que usuario pertenezca a la junta.
- Transacción: update EstadoRequisito + create HistorialRequisito.
- Auditoría.

---

## 6. Cambio de obligación (exención)

Solo ADMIN.

**Endpoint:** `PATCH /usuarios/:id/requisitos/:requisitoTipoId/obligacion`  
Body: `{ obligacionActiva: false }`

Transacción: update EstadoRequisito + create HistorialRequisito.

---

## 7. Flujo automático mensual (día 1)

El cron día 1 itera sobre **RequisitoTipo** con `tieneCorteAutomatico=true` y `activo=true`.

Para cada requisito:
- Buscar usuarios con `obligacionActiva=true` y `estado=AL_DIA` en EstadoRequisito para ese requisitoTipoId.
- Actualizar a MORA.
- Crear HistorialRequisito con `cambioAutomatico: true`.

---

## 8. Integración con carta

En LetterService, al validar requisitos para emitir carta:

- Obtener `getRequisitosParaCarta(usuarioId, juntaId)` → lista de `{ requisitoTipoId, nombre, obligacionActiva, estado }`.
- Para cada requisito con `obligacionActiva=true`: debe estar `estado === AL_DIA`.
- Si alguno falla → error explícito.
- Si `obligacionActiva=false` → se omite la validación de ese requisito.

---

## 9. Reglas duras

- El estado cambia automáticamente el día 1 solo en requisitos con `tieneCorteAutomatico=true`.
- Nunca se cambia estado sin historial.
- Toda consulta respeta multi-tenant vía juntaId.
- No existe deuda monetaria de requisitos.

---

## 10. CRUD RequisitoTipo (solo ADMIN)

- `GET /requisitos` – listar por junta
- `POST /requisitos` – crear (nombre, modificadorId?, tieneCorteAutomatico)
- `PATCH /requisitos/:id` – editar (nombre, modificadorId, tieneCorteAutomatico, activo)
