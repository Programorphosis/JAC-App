---
name: jac-requisitos-adicionales
description: Implements or reviews the dynamic additional requirements module (agua, basura, etc.). Use when working on RequisitoTipo, EstadoRequisito, HistorialRequisito, modificadorId permissions, or the day-1 monthly job that sets users to MORA for requisitos with tieneCorteAutomatico. References flujoRequisitosAdicionales.
---

# Módulo de requisitos adicionales JAC

## Cuándo usar esta skill

- Implementar cambio de estado (AL_DIA / MORA) o cambio de obligación (exento / no exento) por requisito.
- Implementar CRUD de RequisitoTipo (solo ADMIN).
- Implementar el job del día 1 que pasa a MORA a usuarios con obligación activa en requisitos con tieneCorteAutomatico=true.
- Revisar que solo RequisitoService (o casos de uso que lo orquesten) modifiquen EstadoRequisito e HistorialRequisito.

## Principios del módulo

- El sistema **no** procesa dinero de requisitos ni guarda pagos. Solo mantiene estado administrativo (AL_DIA / MORA) por requisito y usuario.
- Cada junta puede tener cero, uno o varios requisitos (agua, basura, etc.) configurados en RequisitoTipo.
- El permiso de actualizar estado viene de `modificadorId` del RequisitoTipo (o rol ADMIN). Cambiar obligación solo ADMIN.
- Estado y obligación se gestionan con **historial**: cada cambio genera registro en HistorialRequisito.
- Multi-tenant: RequisitoTipo tiene juntaId. Toda consulta debe filtrar por junta.

## Cambio manual de estado (modificador o ADMIN)

- Endpoint `POST /usuarios/:id/requisitos/:requisitoTipoId/estado` con `estado: "AL_DIA"` (o MORA).
- Validar que el actor sea modificadorId del RequisitoTipo o ADMIN.
- En transacción: actualizar EstadoRequisito y crear HistorialRequisito.
- Registrar auditoría.

## Cambio de obligación (solo ADMIN)

- Endpoint `PATCH /usuarios/:id/requisitos/:requisitoTipoId/obligacion` con `obligacionActiva: false` (exento).
- Transacción: update EstadoRequisito.obligacionActiva y create HistorialRequisito.

## Corte automático mensual (día 1)

- Job (cron) que itera sobre RequisitoTipo con tieneCorteAutomatico=true y activo=true.
- Para cada requisito: usuarios con obligacionActiva=true y estado=AL_DIA pasan a MORA.
- Usuarios con obligacionActiva=false no se tocan.

## Integración con cartas

- LetterService obtiene getRequisitosParaCarta(usuarioId, juntaId).
- Para cada requisito con obligacionActiva=true: el usuario debe estar AL_DIA.
- Si obligacionActiva=false: se omite la validación de ese requisito.

## Documento de referencia

**flujoRequisitosAdicionales.md** – Modelo, flujos manual y automático, permisos, CRUD RequisitoTipo.
