# Revisión de Arquitectura e Integración – Sistema JAC

**Fecha:** Febrero 2025  
**Alcance:** Fases 0–4 implementadas

---

## 1. Resumen ejecutivo

La implementación está **alineada** con la arquitectura rectora y los documentos de planificación. El dominio permanece puro, el multi-tenant se respeta y la trazabilidad se mantiene mediante auditoría en las operaciones críticas.

---

## 2. Cumplimiento de la arquitectura

### 2.1 Capa de dominio (domain/)

| Regla | Cumplimiento |
|-------|--------------|
| Sin dependencias de Nest, HTTP ni Prisma | ✓ |
| Sin HttpException ni Request/Response | ✓ |
| Lógica pura, determinística, auditable | ✓ |
| Uso de puertos (interfaces) en lugar de implementaciones | ✓ |
| Errores explícitos de dominio | ✓ |

**Servicios:** DebtService, PaymentService, LetterService, WaterService, AuditService.

### 2.2 Capa de aplicación (application/)

| Regla | Cumplimiento |
|-------|--------------|
| Controllers: validar DTO → llamar Service → devolver resultado | ✓ |
| Sin lógica de negocio en controllers | ✓ |
| juntaId siempre desde token (req.user.juntaId) | ✓ |

**Patrones:**
- **Con Application Service:** users, historial-laboral, tarifas (CRUD + auditoría).
- **Directo a Domain:** deuda (consulta de solo lectura, sin auditoría en la consulta).

### 2.3 Infraestructura (infrastructure/)

| Regla | Cumplimiento |
|-------|--------------|
| Implementa puertos de dominio | ✓ |
| Prisma como implementación de persistencia | ✓ |
| Domain services inyectados vía módulos Nest | ✓ |

---

## 3. Multi-tenant y juntaId

### 3.1 Consultas con juntaId

Todas las consultas de datos de junta filtran por `juntaId`:

| Módulo | Filtro |
|--------|--------|
| UsersService | where: { juntaId } o { id, juntaId } |
| HistorialLaboralService | where: { id: usuarioId, juntaId } en Usuario |
| TarifasService | where: { juntaId } |
| PrismaDebtDataProvider | where: { id, juntaId }, { usuarioId, juntaId } |
| PrismaLetterEmissionContext | where: { id, juntaId }, { usuario: { juntaId } } |
| PrismaWaterRepository | where: { usuario: { juntaId } } |
| DeudaController | juntaId del token |

### 3.2 Casos sin juntaId (válidos)

- **JwtStrategy / AuthService:** `findUnique` por `id` (payload.sub) para el usuario autenticado.
- **PlatformController:** Operaciones sobre Juntas (entidad raíz); protegido por PlatformAdminGuard.
- **Bootstrap:** Creación inicial; protegido por token de bootstrap.

### 3.3 JWT y autorización

- Payload: `sub`, `juntaId`, `roles`.
- juntaId nunca se toma del body para autorizar operaciones.
- Login: `juntaId` opcional solo para identificar contexto (Platform Admin vs junta).

---

## 4. Auditoría

| Acción | Auditoría |
|--------|------------|
| Creación de usuario | CREACION_USUARIO ✓ |
| Actualización de usuario | ACTUALIZACION_USUARIO ✓ |
| Alta historial laboral | ALTA_HISTORIAL_LABORAL ✓ |
| Alta tarifa | ALTA_TARIFA ✓ |
| Creación de junta | CREACION_JUNTA ✓ |
| Actualización de junta | ACTUALIZACION_JUNTA ✓ |
| Cambios de agua (WaterService) | vía auditStore ✓ |
| Registro de pago (PaymentService) | vía contexto ✓ |
| Emisión de carta (LetterService) | vía contexto ✓ |

**Consulta de deuda:** No se audita (solo lectura, sin efectos).

---

## 5. Consistencia entre módulos

### 5.1 Estructura de módulos

```
application/
├── users/          → Controller + Service + DTOs
├── historial-laboral/
├── tarifas/
├── deuda/           → Controller (usa DebtService directo)
├── bootstrap/
├── junta/
platform/
```

### 5.2 Patrones de controller

- AuthGuard('jwt') + JuntaGuard en rutas de junta.
- RolesGuard + @Roles() para control por rol.
- juntaId desde `req.user.juntaId!`.
- Respuesta: `{ data, meta: { timestamp } }`.

### 5.3 Enums de Prisma

RolNombre, TipoPago, MetodoPago, EstadoAguaTipo, TipoCambioAgua se importan desde `@prisma/client` como única fuente de verdad.

---

## 6. Mantenibilidad

### 6.1 Puntos fuertes

- **Separación de capas:** Domain sin dependencias de framework.
- **Puertos e implementaciones:** Fácil sustituir Prisma u otras infraestructuras.
- **Errores de dominio:** Traducidos a HTTP en controllers.
- **Documentación:** dev-history/FASE_*.md y referencias en código.

### 6.2 Recomendaciones

| Área | Recomendación |
|------|----------------|
| DTOs de query | Validar `?detalle=` con class-validator si se quiere tipado estricto. |
| Exception filter | Fase 8: filtro global para formato de error según convencionesAPI. |
| Tests | Añadir tests unitarios de DebtService y de integración de endpoints críticos. |

### 6.3 Deuda técnica conocida

- PDF de cartas: `generateCartaPdf` retorna null (Fase 7).
- Revocación de tokens en DB: no implementada (opcional en ROADMAP).
- Bootstrap: creación de Platform Admin sin auditoría (caso especial de inicialización).

---

## 7. Verificación de reglas absolutas (chatModeCursor)

| Regla | Estado |
|-------|--------|
| No inventar funcionalidades | ✓ |
| No pagos parciales | ✓ |
| No guardar deuda en BD | ✓ |
| No editar/borrar históricos | ✓ |
| No mezclar lógica de negocio en controllers | ✓ |
| No confiar en juntaId desde frontend | ✓ |
| Operaciones financieras en transacciones | ✓ (Payment, Water, Letter) |

---

## 8. Conclusión

La arquitectura se respeta y la integración entre capas es coherente. El sistema está preparado para avanzar a la Fase 5 (módulo de pagos) manteniendo los mismos patrones.
