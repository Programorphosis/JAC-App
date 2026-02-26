# Plan de implementación – Operación de juntas

**Versión:** 1.0  
**Fecha:** 2025-02-18  
**Objetivo:** Ordenar e implementar las correcciones y mejoras definidas en `CHECKLIST_OPERACION_JUNTAS.md` y validadas en `VALIDACION_CHECKLIST_OPERACION.md`.

---

## Resumen de decisiones tomadas

| Área | Decisión |
|------|----------|
| Usuario inactivo | No puede solicitar carta ni pagar. Deuda se mantiene. Listados filtran por activo. |
| Bootstrap tarifas | Opción B: exigir configurar; mensaje claro si no hay tarifas. |
| Bootstrap requisitos | No crear; ADMIN los configura. |
| Tarifas editar | "Editar" = nueva tarifa con fecha vigencia=hoy; la anterior deja de ser vigente. |
| referenciaExterna | Efectivo: null; Transferencia: obligatoria; Online: transactionId. |
| Cartas | Evolución: autovalidación (secretaria solo da botón). Mantener RECHAZADA. |
| Nuevos roles | Pendiente planificación (FISCAL, CONSILIADOR, etc.). |

---

## Fase 1 – Validaciones críticas (prioridad alta)

### 1.1 Usuario inactivo: bloquear carta y pago

**Objetivo:** Un usuario con `activo=false` no puede solicitar carta ni registrar/recibir pagos.

**Backend:**
- [ ] En `CartasService.solicitar`: verificar `usuario.activo === true`. Si no → lanzar error de dominio (ej. `UsuarioInactivoError`).
- [ ] En `PagosService` (registro efectivo/transferencia): verificar `usuario.activo === true` antes de registrar.
- [ ] En `PagosService.crearIntencionPagoJunta` y `crearIntencionPagoCarta`: verificar activo antes de crear intención.
- [ ] En `LetterEmissionRunner` / validación de carta: verificar activo (redundante si ya se validó al solicitar, pero defensivo).
- [ ] Crear `UsuarioInactivoError` en domain.errors si no existe.
- [ ] Mapear en domain-exception.filter a 403 o 422.

**Frontend:**
- [ ] En selector de usuario al registrar pago: excluir o marcar usuarios inactivos (opcional; el backend rechazará de todos modos).
- [ ] Mostrar mensaje claro cuando el error sea "Usuario inactivo".

**Criterio de cierre:** Usuario inactivo no puede solicitar carta ni pagar. Mensaje explícito al intentarlo.

**Referencias:** CHECKLIST_OPERACION_JUNTAS §2.1, VALIDACION_CHECKLIST_OPERACION.

---

### 1.2 Mensaje "Configure tarifas" cuando no hay tarifas

**Objetivo:** Guiar al usuario cuando la junta no tiene tarifas configuradas.

**Backend:**
- [x] Endpoint o campo en estado general: `GET /mi-junta` o similar que indique `tieneTarifas: boolean`.
- [x] O: `GET /tarifas` ya retorna lista; si vacía, el frontend puede inferir.

**Frontend:**
- [x] En dashboard: si la junta no tiene tarifas (lista vacía), mostrar banner: "Configure las tarifas en Configuración → Tarifas antes de operar."
- [x] En pantalla de deuda (usuario): si error SinTarifaVigenteError, mensaje amigable + enlace a tarifas.
- [x] En pantalla de pagos (registrar): si no hay tarifas, deshabilitar o advertir antes de intentar.

**Criterio de cierre:** El usuario ve mensaje claro cuando no hay tarifas y sabe dónde configurarlas.

**Referencias:** CHECKLIST_OPERACION_JUNTAS §2.2, decisión Opción B.

---

## Fase 2 – Tarifas: flujo "editar"

### 2.1 Editar tarifa = nueva tarifa + vigencia ✅

**Objetivo:** En el frontend, "editar" una tarifa vigente crea una nueva con fecha de hoy y la anterior deja de ser la vigente para el futuro.

**Contexto técnico:** El schema `Tarifa` no tiene `fechaFin`. La vigencia se determina por `fechaVigencia <= últimoDíaMes` y `ORDER BY fechaVigencia DESC LIMIT 1`. Crear una nueva tarifa con `fechaVigencia = hoy` hace que, para meses futuros, esa sea la vigente. La "anterior" sigue existiendo para meses pasados (cálculo de deuda histórico).

**Backend:**
- [ ] No requiere cambios si solo se crean nuevas tarifas. El endpoint POST /tarifas ya existe.
- [ ] Opcional: endpoint `POST /tarifas/editar-vigente` que reciba (tarifaId, nuevoValorMensual) y cree una nueva con fechaVigencia=hoy. No es estrictamente necesario; el frontend puede llamar a POST /tarifas con los nuevos valores.

**Frontend:**
- [ ] En tarifas-list: añadir botón "Editar" en cada fila (solo para tarifa vigente: la de mayor fechaVigencia para ese estadoLaboral).
- [ ] Al hacer clic en "Editar": abrir formulario prellenado con valor actual y fecha vigencia actual.
- [ ] Al guardar: crear NUEVA tarifa con fechaVigencia = hoy (o la que el usuario elija si se permite), mismo estadoLaboral, nuevo valorMensual.
- [ ] Mensaje: "Se ha creado una nueva tarifa vigente desde hoy. La tarifa anterior seguirá aplicando a los meses pasados."
- [ ] No modificar ni eliminar la tarifa anterior.

**Criterio de cierre:** El usuario puede "editar" una tarifa vigente y el sistema crea una nueva correctamente. El cálculo de deuda usa la tarifa correcta por mes.

**Referencias:** CHECKLIST_OPERACION_JUNTAS §3.2, decisión "editar = nueva + fecha fin anterior".

**Nota:** "Fecha fin anterior" en el modelo actual no requiere campo; la anterior simplemente deja de ser la "última vigente" para meses futuros al existir una con fecha posterior.

---

## Fase 3 – Cartas: rechazar (compatibilidad)

### 3.1 Endpoint rechazar carta ✅

**Objetivo:** Permitir rechazar una carta PENDIENTE con motivo, por compatibilidad y casos excepcionales.

**Backend:**
- [ ] `POST /cartas/:id/rechazar` con body `{ motivoRechazo?: string }`.
- [ ] Solo SECRETARIA. Solo si estado = PENDIENTE.
- [ ] Actualizar carta: estado = RECHAZADA, motivoRechazo = body.motivoRechazo ?? null.
- [ ] Registrar auditoría (CARTA_RECHAZADA).
- [ ] Validar juntaId del token.

**Frontend:**
- [ ] En cartas pendientes: botón "Rechazar" junto a "Validar".
- [ ] Diálogo para ingresar motivo (opcional).
- [ ] Mostrar motivo en detalle de carta si está rechazada.

**Criterio de cierre:** La secretaria puede rechazar una carta con motivo. El usuario ve el motivo.

**Referencias:** CHECKLIST_OPERACION_JUNTAS §5.1, flujoSolicitudCarta.

---

## Fase 4 – Autovalidación de cartas (evolución)

### 4.1 Diseño de autovalidación

**Objetivo:** Si el usuario cumple requisitos (deuda=0, requisitos AL_DIA, pago CARTA), reducir el rol de la secretaria a "dar un botón" para que el usuario obtenga la carta.

**Opciones de diseño:**
- **A) Solicitud con validación previa:** El usuario solo puede solicitar si ya cumple. Al solicitar, la carta pasa a PENDIENTE pero con validación automática: si cumple, se aprueba de inmediato (o la secretaria solo confirma).
- **B) Solicitud + emisión automática:** Si cumple al solicitar, la carta se emite automáticamente sin intervención de secretaria. La secretaria solo ve las que no se pudieron emitir (por no cumplir).
- **C) Botón "Obtener carta" para el usuario:** El usuario ve "Obtener carta" solo si cumple. Al hacer clic, se emite directamente. Sin estado PENDIENTE para estos casos.

**Diseño aprobado:** Ver `DISENO_AUTOVALIDACION_CARTAS.md`.

**Tareas preliminares:**
- [ ] Documentar flujo actual vs flujo deseado.
- [ ] Definir qué hace la SECRETARIA en el nuevo modelo (registrar usuarios, editar, etc.).
- [ ] Ajustar permisos si cambia el rol de SECRETARIA.
- [ ] Implementar según diseño elegido.

**Referencias:** CHECKLIST_OPERACION_JUNTAS §5.1, decisión autovalidación.

---

## Fase 5 – Nuevos roles

### 5.1 Planificación de roles adicionales

**Objetivo:** Añadir roles como FISCAL, CONSILIADOR con permisos definidos.

**Diseño aprobado:** Ver `DISENO_ROL_FISCAL.md`. Solo FISCAL por ahora.
- [ ] Definir permisos por rol (matriz).
- [ ] Documentar en MATRIZ_PERMISOS_ROLES.md.
- [ ] Crear migración: añadir valores a enum RolNombre en Prisma.
- [ ] Actualizar permissions-from-roles.ts.
- [ ] Actualizar permissions.constants.ts (backend y frontend).
- [ ] Actualizar guards y menú en frontend.
- [ ] Seed o proceso para asignar roles a usuarios existentes si aplica.

**No iniciar implementación hasta tener diseño aprobado.**

**Referencias:** CHECKLIST_OPERACION_JUNTAS §12.

---

## Orden de ejecución recomendado

| Orden | Fase | Esfuerzo estimado | Dependencias |
|-------|------|------------------|--------------|
| 1 | 1.1 Usuario inactivo | 2-4 h | Ninguna |
| 2 | 1.2 Mensaje tarifas | 1-2 h | Ninguna |
| 3 | 2.1 Editar tarifa | 2-3 h | Ninguna |
| 4 | 3.1 Rechazar carta | 2-3 h | Ninguna |
| 5 | 4.1 Autovalidación (diseño) | — | Documento de diseño |
| 6 | 4.x Autovalidación (impl.) | 8-16 h | Fase 5.1 |
| 7 | 5.1 Nuevos roles (diseño) | — | Definición de negocio |
| 8 | 5.x Nuevos roles (impl.) | 4-8 h | Fase 7 |

---

## Documentos relacionados

- `CHECKLIST_OPERACION_JUNTAS.md` – Checklist con decisiones
- `VALIDACION_CHECKLIST_OPERACION.md` – Resultado de validación en código
- `MATRIZ_PERMISOS_ROLES.md` – Permisos por rol
- `flujoSolicitudCarta.md` – Flujo actual de cartas
- `calculadoraDeDeuda.md` – Cálculo de deuda y tarifas
