# Roadmap: Wompi por junta

**Objetivo:** Implementar credenciales Wompi por junta de forma sólida y definitiva.

**Referencia:** `WOMPI_POR_JUNTA_PLAN.md`, `WOMPI_POR_JUNTA_DOC.md`

---

## Fase 0: Preparación

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 0.1 | Crear `ENCRYPTION_MASTER_KEY` (openssl rand -hex 32) | ⬜ | Añadir a .env.example |
| 0.2 | Revisar documentación Wompi (docs.wompi.co) | ⬜ | Payment Links, webhooks |
| 0.3 | Confirmar que facturación plataforma usa env vars | ⬜ | No tocar ese flujo |

---

## Fase 1: Infraestructura base

| # | Tarea | Estado | Archivos | Dependencias |
|---|-------|--------|----------|--------------|
| 1.1 | Crear EncryptionService (AES-256-GCM) | ⬜ | infrastructure/encryption/ | - |
| 1.2 | Crear EncryptionModule | ⬜ | infrastructure/encryption/ | 1.1 |
| 1.3 | Añadir campos Junta al schema Prisma | ⬜ | prisma/schema.prisma | - |
| 1.4 | Migración add_junta_wompi_credentials | ⬜ | prisma/migrations/ | 1.3 |
| 1.5 | Actualizar .env.example con ENCRYPTION_MASTER_KEY | ⬜ | .env.example | - |

---

## Fase 2: WompiService refactor

| # | Tarea | Estado | Archivos | Dependencias |
|---|-------|--------|----------|--------------|
| 2.1 | Definir interface WompiCredenciales | ⬜ | infrastructure/wompi/ | - |
| 2.2 | Refactor crearPaymentLink(params, credenciales) | ⬜ | wompi.service.ts | 2.1 |
| 2.3 | Refactor obtenerTransaccion(id, credenciales) | ⬜ | wompi.service.ts | 2.1 |
| 2.4 | Eliminar uso de env en constructor (o mantener fallback interno) | ⬜ | wompi.service.ts | 2.2, 2.3 |

---

## Fase 3: Platform Admin – Configuración Wompi

| # | Tarea | Estado | Archivos | Dependencias |
|---|-------|--------|----------|--------------|
| 3.1 | Crear ActualizarWompiJuntaDto | ⬜ | platform/dto/ | - |
| 3.2 | PlatformJuntasService.actualizarWompi | ⬜ | platform-juntas.service.ts | 1.1, 1.4 |
| 3.3 | Endpoint PATCH /platform/juntas/:id/wompi | ⬜ | platform-juntas.controller.ts | 3.1, 3.2 |
| 3.4 | No exponer credenciales en GET /juntas/:id | ⬜ | platform-juntas.service.ts | - |
| 3.5 | Auditoría CONFIG_WOMPI_JUNTA | ⬜ | platform-juntas.service.ts | 3.2 |
| 3.6 | JuntaWompiCardComponent (UI) | ⬜ | platform/junta-detail/ | 3.3 |
| 3.7 | Integrar card en junta-detail | ⬜ | junta-detail.component | 3.6 |

---

## Fase 4: PagosService – Crear intención

| # | Tarea | Estado | Archivos | Dependencias |
|---|-------|--------|----------|--------------|
| 4.1 | Inyectar EncryptionService en PagosService | ⬜ | pagos.service.ts | 1.1 |
| 4.2 | Crear helper obtenerCredencialesWompiJunta(juntaId) | ⬜ | pagos.service.ts | 1.1, 1.4 |
| 4.3 | Modificar crearIntencionPagoOnline (JUNTA) | ⬜ | pagos.service.ts | 2.2, 4.2 |
| 4.4 | Modificar crearIntencionPagoCartaOnline (CARTA) | ⬜ | pagos.service.ts | 2.2, 4.2 |
| 4.5 | redirectUrl con junta_id | ⬜ | pagos.service.ts | 4.3, 4.4 |
| 4.6 | Error si junta sin credenciales | ⬜ | pagos.service.ts | 4.2 |

---

## Fase 5: Webhook

| # | Tarea | Estado | Archivos | Dependencias |
|---|-------|--------|----------|--------------|
| 5.1 | Resolver juntaId desde payment_link_id | ⬜ | webhooks.controller.ts | - |
| 5.2 | Cargar wompiEventsSecret de junta | ⬜ | webhooks.controller.ts | 1.1 |
| 5.3 | Validar firma con secret de junta | ⬜ | webhooks.controller.ts | 5.1, 5.2 |
| 5.4 | Rechazar si junta sin eventsSecret | ⬜ | webhooks.controller.ts | 5.2 |
| 5.5 | Inyectar PrismaService, EncryptionService en WebhooksController | ⬜ | webhooks.controller.ts | 5.1 |

---

## Fase 6: Verificación retorno

| # | Tarea | Estado | Archivos | Dependencias |
|---|-------|--------|----------|--------------|
| 6.1 | PagosController: verificar requiere junta_id | ⬜ | pagos.controller.ts | - |
| 6.2 | PagosService.consultarYRegistrarSiAprobado(transactionId, juntaId) | ⬜ | pagos.service.ts | 2.3, 4.2 |
| 6.3 | Validar que user.juntaId === juntaId (seguridad) | ⬜ | pagos.controller.ts | 6.1 |
| 6.4 | Frontend: leer junta_id de URL | ⬜ | pagos-retorno.component.ts | - |
| 6.5 | Frontend: pasar junta_id a verificarPagoOnline | ⬜ | pagos.service.ts (frontend) | 6.4 |

---

## Fase 7: Integración y pruebas

| # | Tarea | Estado | Archivos | Dependencias |
|---|-------|--------|----------|--------------|
| 7.1 | Configurar junta de prueba con credenciales (mismas que plataforma) | ⬜ | Manual | 3.6 |
| 7.2 | Prueba E2E: crear intención → pagar → webhook | ⬜ | Manual | 4.x, 5.x |
| 7.3 | Prueba E2E: crear intención → pagar → retorno | ⬜ | Manual | 4.x, 6.x |
| 7.4 | Prueba: junta sin credenciales → error esperado | ⬜ | Manual | 4.6 |
| 7.5 | Verificar que facturación plataforma no se afecta | ⬜ | Manual | - |

---

## Fase 8: Documentación final

| # | Tarea | Estado | Archivos | Dependencias |
|---|-------|--------|----------|--------------|
| 8.1 | Actualizar WOMPI_VARIABLES_ENTORNO.md (separar plataforma vs junta) | ⬜ | docs/ | - |
| 8.2 | Completar WOMPI_POR_JUNTA_DOC.md con detalles finales | ⬜ | docs/ | 7.x |
| 8.3 | Actualizar PLAN_ADMINISTRADOR_PLATAFORMA.md | ⬜ | docs/ | - |
| 8.4 | README o guía para configurar Wompi por junta | ⬜ | docs/ | - |

---

## Orden de ejecución recomendado

```
Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7 → Fase 8
```

**Bloques paralelizables:** 3.1-3.5 pueden avanzar en paralelo con 2.x una vez 1.x esté listo.

---

## Checklist de completitud

- [ ] Todas las tareas de Fase 1-6 marcadas
- [ ] Pruebas E2E exitosas (Fase 7)
- [ ] Documentación actualizada (Fase 8)
- [ ] Sin credenciales en logs
- [ ] Code review realizado
