## Contexto

Estamos en la Fase 6 del ROADMAP (módulo agua). Antes de implementar, decidimos cambiar el modelo: en lugar de un módulo fijo de "agua", implementar un sistema de **requisitos adicionales dinámicos** por junta. Cada junta puede tener cero, uno o varios requisitos (agua, basura, etc.) que son filtros para la validación de la carta. Cada requisito tiene un modificador asignado (usuarioId) que puede actualizar su estado.

## Instrucción previa obligatoria

**Antes de cualquier cambio:** ejecuta `git add -A` y `git commit -m "checkpoint: estado antes de refactor requisitos adicionales"` para guardar el estado actual. Si no hay repo inicializado, crea uno con `git init` y haz el commit.

## Alcance del trabajo

### 1. Base de datos (Prisma)

- Crear modelo `RequisitoTipo`: id, juntaId, nombre, modificadorId (usuarioId), tieneCorteAutomatico, activo, fechaCreacion.
- Crear modelo `EstadoRequisito`: usuarioId, requisitoTipoId, estado (AL_DIA|MORA), obligacionActiva, fechaUltimoCambio. PK compuesta (usuarioId, requisitoTipoId).
- Crear modelo `HistorialRequisito`: id, usuarioId, requisitoTipoId, tipoCambio (ESTADO|OBLIGACION), estadoAnterior, estadoNuevo, obligacionAnterior, obligacionNueva, cambiadoPorId, cambioAutomatico, fechaCambio.
- Eliminar modelos `EstadoAgua` y `HistorialAgua`.
- Crear migración que: (a) cree las nuevas tablas, (b) por cada junta cree un RequisitoTipo "agua" con modificadorId = primer usuario con rol RECEPTOR_AGUA de esa junta (o null si no hay), (c) migre datos de EstadoAgua → EstadoRequisito, (d) migre HistorialAgua → HistorialRequisito, (e) elimine tablas antiguas.
- Actualizar relaciones en Usuario, Junta. Quitar referencias a estadoAgua, historialAgua.
- El enum EstadoAguaTipo y TipoCambioAgua pueden reutilizarse o renombrarse a EstadoRequisitoTipo, TipoCambioRequisito.

### 2. Dominio e infraestructura

- Renombrar/refactorizar WaterService → RequisitoService (o mantener nombre si prefieres, pero la lógica debe ser genérica por requisitoTipoId).
- Actualizar IWaterRepository → IRequisitoRepository (o similar): métodos que reciban requisitoTipoId.
- PrismaWaterRepository → PrismaRequisitoRepository.
- LetterService: cambiar getEstadoAgua() por getRequisitosParaCarta(usuarioId, juntaId) que devuelva lista de { requisitoTipoId, nombre, obligacionActiva, estado }. Validar que todos los requisitos activos con obligacionActiva=true estén AL_DIA.
- ILetterEmissionContext: reemplazar getEstadoAgua por getRequisitosParaCarta.
- WaterOperationRunner → RequisitoOperationRunner (o similar): updateEstadoRequisito(requisitoTipoId, usuarioId, nuevoEstado), updateObligacionRequisito, applyMonthlyCutoff (solo para requisitos con tieneCorteAutomatico=true).
- Permisos: puede actualizar estado si usuarioId === modificadorId del RequisitoTipo O si tiene rol ADMIN. Cambiar obligación (exento) solo ADMIN.

### 3. Application layer

- Endpoints: POST /usuarios/:id/requisitos/:requisitoTipoId/estado (body: { estado: "AL_DIA" }), PATCH /usuarios/:id/requisitos/:requisitoTipoId/obligacion (body: { obligacionActiva: false }).
- CRUD RequisitoTipo: GET /requisitos (por junta), POST /requisitos, PATCH /requisitos/:id. Solo ADMIN.
- Eliminar endpoints /agua.
- Crear controladores y DTOs necesarios.

### 4. Cron día 1

- El job debe iterar sobre RequisitoTipo con tieneCorteAutomatico=true y aplicar corte por cada uno (usuarios con obligacionActiva=true y estado=AL_DIA → MORA).

### 5. Documentación

- Actualizar o crear `docs/flujoRequisitosAdicionales.md` (reemplazar flujoReceptorDeAgua.md): propósito, modelo, flujos manual/automático, permisos, integración con carta.
- Actualizar `docs/definicionDomainServices.md`: WaterService → RequisitoService, responsabilidades.
- Actualizar `docs/ROADMAP.md` Fase 6: referencias a requisitos adicionales dinámicos, no solo agua.
- Actualizar `docs/SCHEMA BASE v1.md` si existe.
- Actualizar `docs/flujoSolicitudCarta.md`: validación por requisitos adicionales.
- Crear `dev-history/FASE_6.md` con el trabajo realizado.

### 6. Rules y Skills

- Actualizar `.cursor/rules/jac-project-context.mdc` si menciona agua o módulo agua.
- Actualizar skill `jac-water-module` → `jac-requisitos-adicionales` (o similar): descripción, cuándo usarla, referencias a la nueva documentación.
- Revisar otras rules que mencionen agua, RECEPTOR_AGUA, EstadoAgua.

### 7. Rol RECEPTOR_AGUA

- Mantenerlo en el enum por compatibilidad con bootstrap/usuarios existentes.
- Usarlo en la migración para asignar el primer modificador de "agua".
- En el nuevo modelo, el permiso de actualización viene de modificadorId, no del rol. ADMIN puede asignar cualquier usuario como modificador.

## Orden sugerido

1. Git commit (obligatorio).
2. Documentación nueva/actualizada (para tener el contrato claro).
3. Schema Prisma + migración.
4. Dominio (ports, types, RequisitoService).
5. Infraestructura (PrismaRequisitoRepository, etc.).
6. Application (controllers, DTOs).
7. LetterService + contexto.
8. Cron job.
9. Rules y skills.
10. dev-history/FASE_6.md.

## Reglas

- No inventar funcionalidades no definidas.
- Toda consulta debe filtrar por juntaId.
- Mantener auditoría en cambios críticos.
- Seguir convenciones API existentes (data, meta, códigos HTTP).
- No pagos parciales, no editar histórico.