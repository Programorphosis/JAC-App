---
name: jac-roadmap-and-phases
description: Guides development order and phase completion using the project roadmap. Use when the user asks about what to build next, phase order, dependencies between features, or criteria to consider a phase done. References ROADMAP.md, CHATMODE_PLAN_DESARROLLO.md.
---

# Roadmap y fases JAC

## Cuándo usar esta skill

- Preguntas sobre orden de desarrollo ("¿qué sigue?", "¿qué hacer primero?").
- Definir criterios de "listo" para una fase.
- Resolver dependencias entre módulos (deuda → pagos → Wompi; requisitos; cartas).
- Ajustar o revisar el plan sin implementar (usar en conjunto con CHATMODE_PLAN_DESARROLLO si es solo planificación).

## Orden de fases (resumen)

0. Documentación (cerrada).  
1. Prisma estable + contratos dominio.  
2. Domain Layer (Debt → Audit → Payment → Water → Letter).  
3. Auth + Application base (users, historial laboral, tarifas).  
4. Endpoints deuda.  
5. Pagos (efectivo + online: webhook, retorno, reconciliación).  
6. Módulo requisitos adicionales (manual + cron día 1).  
7. Cartas (solicitud, validación, PDF, QR público).  
8. Auditoría global + seguridad (rate limit, HMAC).  
9–10. Frontend admin y usuario.  
11. Wompi completo y reconciliación.  
12. Deploy.

No avanzar de fase sin confirmación explícita cuando así esté definido en el proyecto.

## Dependencias clave

- Domain (Fase 2) antes de Application que lo use.
- Auth y multi-tenant (Fase 3) antes de endpoints de negocio.
- Deuda (Fase 4) antes de pagos (Fase 5). Pagos antes de Wompi completo (Fase 11).
- Agua (Fase 6) y deuda/pagos relevantes antes de cartas (Fase 7).

## Criterios de cierre (ejemplos)

- Fase 1: Schema Prisma alineado a SCHEMA BASE v1, referenciaExterna unique en Pago, migraciones aplicadas.
- Fase 2: Servicios de dominio implementados según definicionDomainServices.md, sin dependencias HTTP.
- Fase 5: Pago efectivo con transacción serializable; flujo online con webhook + retorno + idempotencia.

## Documentos de referencia

- **ROADMAP.md** – Fases completas, entregables, matriz de dependencias, criterios por fase.
- **CHATMODE_PLAN_DESARROLLO.md** – Cómo discutir y ajustar el plan (alcance, prioridades, preguntas útiles).
