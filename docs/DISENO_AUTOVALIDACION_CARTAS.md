# Diseño – Autovalidación de cartas

**Versión:** 1.0  
**Fecha:** 2025-02-18  
**Estado:** Aprobado para implementación

---

## 1. Resumen de decisiones

| Área | Decisión |
|------|----------|
| Modelo de flujo | **Opción B:** Si cumple al solicitar, la carta se emite automáticamente sin intervención de la secretaria. La secretaria solo ve las que no se pudieron emitir. |
| Usuario que no cumple | **No puede solicitar.** Solo mensajes guía: "Debe pagar deuda", "Debe regularizar requisitos", etc. |
| Rol SECRETARIA | Solo ver y gestionar cartas que no se emitieron automáticamente. Puede solicitar cartas en nombre de otros usuarios, **solo si cumplen** (y se emiten automáticamente). |
| Auditoría | Siempre hay usuario responsable. Para emisión automática: `emitidaPorId` = ADMIN de la junta (primer usuario con rol ADMIN). |

---

## 2. Flujo deseado

### 2.1 Usuario AFILIADO solicita carta para sí mismo

1. **Si cumple** (deuda=0, requisitos AL_DIA, pago CARTA vigente):
   - POST /cartas/solicitar → la carta se **emite de inmediato** (estado APROBADA, PDF generado, consecutivo asignado).
   - No pasa por PENDIENTE.
   - `emitidaPorId` = id del ADMIN de la junta (responsable por defecto en emisiones automáticas).
   - Auditoría: ALTA_CARTA o similar con metadata `origen: 'autovalidacion'`.

2. **Si no cumple**:
   - No puede solicitar. El frontend no muestra botón "Solicitar carta" (o está deshabilitado).
   - Mensajes según lo que falte: deuda, pago carta, requisitos.

### 2.2 SECRETARIA solicita carta para otro usuario

1. **Si el usuario cumple**:
   - POST /cartas/solicitar con usuarioId → carta se emite automáticamente.
   - `emitidaPorId` = id de la SECRETARIA (quien ejecutó la acción).
   - Auditoría con ejecutadoPorId = SECRETARIA.

2. **Si el usuario no cumple**:
   - No se permite solicitar. Backend rechaza con error de dominio (ej. RequisitosCartaNoCumplidosError, o similar si falta deuda/pago).

### 2.3 Pantalla "Cartas pendientes" (SECRETARIA)

- Solo muestra cartas que **no se pudieron emitir automáticamente**.
- Con el diseño actual (opción B pura), si solo se puede solicitar cuando se cumple, **no debería haber cartas pendientes** en el flujo normal.
- **Excepción:** Si en el futuro se permite solicitar sin cumplir (casos especiales), esas irían a PENDIENTE y la secretaria las vería.
- **Por ahora:** La pantalla puede quedar vacía la mayoría del tiempo, o mostrarse solo cuando haya un flujo alternativo. Se mantiene por compatibilidad y posibles casos edge (ej. error en emisión automática que deje una carta en estado intermedio).

---

## 3. Cambios técnicos

### 3.1 Backend

| Componente | Cambio |
|------------|--------|
| `CartasService.solicitar` | En lugar de crear carta PENDIENTE, validar requisitos (deuda, pago carta, requisitos) y si cumple → llamar a `LetterEmissionRunner.emitLetter` directamente. Si no cumple → lanzar error. |
| `LetterService` / `LetterEmissionRunner` | Recibir `emitidaPorId` como parámetro (obligatorio). Para AFILIADO propio: obtener ADMIN de la junta. Para SECRETARIA solicitando para otro: usar id de la SECRETARIA. |
| Auditoría | Registrar evento con `ejecutadoPorId` = quien solicitó (AFILIADO o SECRETARIA). Para `emitidaPorId` en Carta: ADMIN si es AFILIADO propio, SECRETARIA si es SECRETARIA. |
| Estado PENDIENTE | Ya no se usa en el flujo normal. Se mantiene el modelo por si se necesita en el futuro (rechazo manual, etc.). |

### 3.2 Frontend

| Componente | Cambio |
|------------|--------|
| Usuario-cartas (AFILIADO) | Botón "Solicitar carta" solo visible/habilitado si `puedeSolicitar()` (ya existe). Al hacer clic → POST solicitar → si éxito, la respuesta incluye carta APROBADA con datos para descargar. Mostrar mensaje "Carta emitida" y permitir descargar de inmediato. |
| Cartas pendientes (SECRETARIA) | Mantener pantalla. Listará cartas PENDIENTE (vacía en flujo normal). Si en el futuro hay PENDIENTEs, mostrar Validar/Rechazar. |
| SECRETARIA solicitar para otro | Solo permitir si el usuario cumple. Llamar a estado-general o similar para validar antes de mostrar opción. Al solicitar → emisión automática. |

### 3.3 Obtención del ADMIN de la junta

- Consulta: `UsuarioRol` + `Rol` donde `Rol.nombre = 'ADMIN'` y `Usuario.juntaId = juntaId`.
- Tomar el primer usuario ADMIN (o definir criterio: más antiguo, etc.).
- Usar su `id` como `emitidaPorId` cuando el AFILIADO solicita para sí.

---

## 4. Casos edge

| Caso | Comportamiento |
|------|----------------|
| Emisión automática falla (ej. S3, PDF) | La carta podría quedar en estado inconsistente. Considerar: crear carta PENDIENTE si falla emisión, para que secretaria pueda reintentar. O fallar la solicitud y mostrar error al usuario. |
| Límite de cartas del plan | Validar antes de emitir. Si se excede, no emitir y mostrar error (o dejar en PENDIENTE para secretaria). |
| Varios ADMIN en la junta | Usar el primero encontrado (orden estable). Documentar en código. |

---

## 5. Criterios de cierre

- [x] AFILIADO que cumple: al solicitar, recibe carta aprobada de inmediato sin pasar por secretaria.
- [x] AFILIADO que no cumple: no puede solicitar; mensajes claros (RequisitosCartaNoCumplidosError).
- [x] SECRETARIA puede solicitar para otro solo si cumple; se emite automáticamente con emitidaPorId = SECRETARIA.
- [x] Auditoría registra correctamente (EMISION_CARTA con emitidaPorId).
- [x] Pantalla "Cartas pendientes" se mantiene; vacía en flujo normal.

---

## 6. Referencias

- `PLAN_IMPLEMENTACION_OPERACION.md` Fase 4
- `CHECKLIST_OPERACION_JUNTAS.md` §5.1
- `flujoSolicitudCarta.md`
