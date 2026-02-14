# Fase 6 – Requisitos adicionales dinámicos

**Fecha:** 2025-02-13  
**Objetivo:** Refactorizar el módulo agua fijo a un sistema de requisitos adicionales dinámicos por junta.

---

## Resumen del trabajo

Se reemplazó el modelo fijo de agua (EstadoAgua, HistorialAgua) por un sistema configurable donde cada junta puede tener cero, uno o varios requisitos (agua, basura, etc.) que actúan como filtros para la validación de la carta laboral.

---

## Cambios realizados

### 1. Base de datos (Prisma)

- **Nuevos modelos:**
  - `RequisitoTipo`: id, juntaId, nombre, modificadorId, tieneCorteAutomatico, activo, fechaCreacion
  - `EstadoRequisito`: PK compuesta (usuarioId, requisitoTipoId), estado, obligacionActiva, fechaUltimoCambio
  - `HistorialRequisito`: id, usuarioId, requisitoTipoId, tipoCambio, estadoAnterior/Nuevo, obligacionAnterior/Nueva, cambiadoPorId, cambioAutomatico, fechaCambio

- **Enums renombrados:** EstadoAguaTipo → EstadoRequisitoTipo, TipoCambioAgua → TipoCambioRequisito

- **Migración:** `20250213200000_refactor_requisitos_adicionales`
  - Crea tablas nuevas
  - Por cada junta crea RequisitoTipo "agua" con modificadorId = primer usuario RECEPTOR_AGUA (o null)
  - Migra EstadoAgua → EstadoRequisito, HistorialAgua → HistorialRequisito
  - Elimina tablas antiguas

### 2. Dominio

- **WaterService** → **RequisitoService**: métodos `updateEstadoRequisito`, `updateObligacionRequisito`, `applyMonthlyCutoff`
- **IWaterRepository** → **IRequisitoRepository**: métodos por requisitoTipoId
- **LetterService**: `getEstadoAgua` → `getRequisitosParaCarta`; valida que todos los requisitos activos con obligacionActiva=true estén AL_DIA
- **ILetterEmissionContext**: reemplazado getEstadoAgua por getRequisitosParaCarta

### 3. Infraestructura

- **PrismaWaterRepository** → **PrismaRequisitoRepository**
- **WaterOperationRunner** → **RequisitoOperationRunner**
- **WaterModule** → **RequisitoModule**
- Eliminado módulo water

### 4. Application layer

- **RequisitosModule** con:
  - `RequisitosController`: GET/POST/PATCH /requisitos (CRUD RequisitoTipo, solo ADMIN)
  - `RequisitosUsuarioController`: POST /usuarios/:id/requisitos/:requisitoTipoId/estado, PATCH .../obligacion
- Permisos: actualizar estado si modificadorId o ADMIN; cambiar obligación solo ADMIN
- **RequisitosCronService**: cron día 1 con @Cron('0 0 1 * *')

### 5. Documentación

- Creado `docs/flujoRequisitosAdicionales.md` (reemplaza flujoReceptorDeAgua.md)
- Actualizado `docs/definicionDomainServices.md`: WaterService → RequisitoService
- Actualizado `docs/ROADMAP.md` Fase 6
- Actualizado `docs/flujoSolicitudCarta.md`: validación por requisitos adicionales
- Actualizado `docs/consecutivosYCronJobs.md`

### 6. Rules y skills

- Actualizado `.cursor/rules/jac-project-context.mdc`
- Creado skill `jac-requisitos-adicionales` (reemplaza jac-water-module)

---

## Rol RECEPTOR_AGUA

- Mantenido en el enum por compatibilidad con bootstrap y usuarios existentes.
- Usado en la migración para asignar el primer modificador de "agua".
- En el nuevo modelo, el permiso de actualización viene de `modificadorId`, no del rol. ADMIN puede asignar cualquier usuario como modificador.

---

## Endpoints

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | /requisitos | ADMIN | Listar requisitos de la junta |
| POST | /requisitos | ADMIN | Crear RequisitoTipo |
| PATCH | /requisitos/:id | ADMIN | Editar RequisitoTipo |
| POST | /usuarios/:id/requisitos/:requisitoTipoId/estado | Modificador o ADMIN | Actualizar estado (AL_DIA/MORA) |
| PATCH | /usuarios/:id/requisitos/:requisitoTipoId/obligacion | ADMIN | Cambiar obligación (exento) |

---

## Notas

- La migración requiere aplicar `prisma migrate dev` con base de datos disponible.
- El cron usa el primer usuario ADMIN encontrado para auditoría.
- Si no hay EstadoRequisito para un usuario en un requisito, getRequisitosParaCarta devuelve obligacionActiva: true, estado: MORA por defecto (ausencia de registro = no cumplido; seguro ante auditoría).
