# Chatmode: Plan de Desarrollo – Sistema JAC

**Uso:** Activa este modo cuando quieras **definir, refinar o ajustar** el plan de desarrollo con el asistente. Copia el bloque "Prompt para Cursor" en el chat o úsalo como contexto en Composer.

---

## Objetivo de este chatmode

- Definir o ajustar **alcance, prioridades y orden** de desarrollo.
- Resolver **ambigüedades** antes de codificar (qué se hace en cada fase, qué queda fuera del MVP).
- Validar que **cambios de plan** no rompan principios (multi-tenant, auditoría, sin pagos parciales, etc.).
- Mantener **alineación** entre ROADMAP, arquitectura rectora y documentación de flujos.

**No sustituye** a `chatModeCursor.md` (reglas de implementación). Este chatmode es **solo para planificación**.

---

## Prompt para Cursor (copiar al chat)

```
Estamos en modo PLAN DE DESARROLLO del sistema JAC.

Contexto obligatorio:
- Proyecto: sistema digital para Juntas de Acción Comunal (multi-tenant, auditable, sin pagos parciales).
- Documentos base: plan.md, 00_ARQUITECTURA_RECTOR copy.md, ROADMAP.md, definicionDomainServices.md, flujos de pago/carta/agua.
- Principios no negociables: junta_id en toda consulta, deuda calculada (no guardada), solo pagos totales, auditoría en acciones críticas.

Objetivo de esta conversación:
- Definir o refinar el plan de desarrollo (alcance, fases, prioridades, criterios de “listo”).
- Resolver dudas de alcance antes de implementar.
- Ajustar ROADMAP o fases solo si está justificado y no viola principios.

Reglas para ti (asistente):
1. Ante cualquier duda de alcance o orden: preguntar en lugar de asumir.
2. Citar siempre el documento que respalda una fase o regla (ej. ROADMAP.md Fase X, plan.md §Y).
3. Si el usuario propone un cambio que afecte multi-tenant, auditoría, pagos totales o cálculo de deuda: advertir impacto y pedir confirmación.
4. No inventar fases ni funcionalidades no descritas en la documentación; si hace falta, proponer “añadir a ROADMAP” y redactar el cambio.
5. Para cada fase discutida: recordar dependencias (qué debe estar listo antes) y criterio de cierre.
6. Respuestas en español, claras y con referencias a archivos (plan.md, ROADMAP.md, etc.).
```

---

## Preguntas útiles para definir el plan

Usa estas preguntas durante la conversación según lo que quieras afinar.

### Alcance y MVP

- ¿Qué flujos son obligatorios para el MVP (solo efectivo, o efectivo + online)?
- ¿Cartas en MVP o en una fase posterior?
- ¿Corte automático de agua (día 1) entra en MVP o se hace manual al inicio?
- ¿Frontend usuario (autogestión) es MVP o solo panel administrativo?

### Orden y dependencias

- ¿Qué debe estar listo antes de empezar pagos online (deuda, webhook, reconciliación)?
- ¿Implementamos primero todos los Domain Services o vamos módulo por módulo (deuda → pagos → agua → cartas)?
- ¿La auditoría (interceptor global) va antes o después de los módulos de negocio?

### Criterios de “listo”

- ¿Cómo validamos que la Fase 2 (Domain) está cerrada: tests unitarios, revisión de código, o ambos?
- ¿Qué consideramos “listo” para Fase 5 (pagos): solo efectivo, o efectivo + webhook + retorno + reconciliación?
- ¿Definimos checklist explícito por fase en ROADMAP?

### Riesgos y principios

- Si agregamos [X funcionalidad], ¿rompe algún principio (no pagos parciales, no guardar deuda, multi-tenant)?
- ¿Hay algo en la documentación que sea contradictorio y debamos resolver antes de desarrollar?
- ¿La seguridad (rate limit, HMAC, hash encadenado) es bloqueante para MVP o la dejamos para Fase 8?

### Ajustes al ROADMAP

- Si movemos [Fase A] antes de [Fase B], ¿qué dependencias se rompen?
- ¿Añadimos una subfase para [tema] o lo dejamos dentro de la fase existente?
- ¿Actualizamos ROADMAP.md con este acuerdo y en qué sección?

---

## Flujo sugerido de una sesión de planificación

1. **Objetivo claro:** “Quiero definir qué entra en MVP” / “Quiero reordenar las fases X y Y” / “Quiero añadir una fase para [tema]”.
2. **Contexto:** Indicar en qué fase está el proyecto hoy (ej. “Prisma ya está, vamos a Domain”).
3. **Preguntas:** Usar las preguntas de la sección anterior según el tema.
4. **Acuerdos:** Dejar por escrito qué se decidió (ej. “MVP incluye: usuarios, deuda, pago efectivo, agua manual, cartas con validación”).
5. **Actualización:** Si aplica, indicar qué archivo actualizar (ROADMAP.md, plan.md) y con qué texto.

---

## Principios que no se negocian en planificación

Estos no se cambian en una sesión de “plan de desarrollo”; solo se respetan al definir alcance y orden:

- Toda entidad de negocio con `juntaId`; ninguna consulta sin filtrar por junta.
- Deuda calculada bajo demanda; no almacenada.
- Solo pagos totales (no parciales).
- Auditoría en acciones críticas (pagos, cartas, agua, historial laboral).
- Backend como única fuente de verdad; frontend no define montos ni reglas.
- Transacciones para operaciones que afecten múltiples tablas (pagos, cartas, agua).

Si alguien propone relajar alguno de estos, el chatmode debe **advertir** y pedir confirmación explícita, y en ese caso quedar registrado como decisión de proyecto (no como “default” del plan).

---

## Referencias rápidas

| Necesito… | Ver documento |
|-----------|----------------|
| Orden de fases y dependencias | `ROADMAP.md` |
| Reglas al codificar | `chatModeCursor.md` |
| Visión general y principios | `plan.md` |
| Multi-tenant y seguridad base | `00_ARQUITECTURA_RECTOR copy.md` |
| Servicios de dominio y contratos | `definicionDomainServices.md` |
| Flujos de pago / carta / agua | `flujoDePagos.md`, `flujoSolicitudCarta.md`, `flujoReceptorDeAgua.md` |
| Casos especiales (webhook, doble pago) | `flujoDePagosCasoFallaWebhook.md`, `flujoDePagosCondicionDeCarrera.md` |

---

## Ejemplo de inicio de conversación

> “Activa el chatmode de plan de desarrollo. Estamos por empezar la Fase 2 (Domain). Quiero definir: (1) ¿implementamos los cinco servicios de dominio en un solo bloque o por módulo (deuda → pagos → agua → cartas)? (2) ¿Qué criterio usamos para dar por cerrada la Fase 2?”

El asistente debe responder usando ROADMAP.md y definicionDomainServices.md, citar dependencias y proponer criterios de cierre sin inventar fases nuevas.

---

*Este chatmode complementa `chatModeCursor.md`: uno para planificar, otro para implementar.*
