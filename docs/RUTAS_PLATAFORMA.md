# Rutas API – Plataforma Administrador

**Prefijo base:** `/api/platform/`

Este documento describe la estructura de rutas del módulo Platform Admin y el orden de registro de controllers que comparten el path `platform/juntas`.

---

## 1. Controllers y paths

| Controller | Path base | Descripción |
|------------|-----------|-------------|
| PlatformJuntasController | `platform/juntas` | CRUD juntas, suscripciones, admin |
| PlatformFacturasController | `platform/juntas` | Facturas y pagos plataforma por junta |
| PlatformOperacionesController | `platform/juntas` | Notas y exportación por junta |
| PlatformAuditoriaController | `platform/auditoria` | Auditoría de plataforma |
| PlatformDashboardController | `platform/dashboard` | Dashboard principal |
| PlatformPlanesController | `platform/planes` | Planes disponibles |
| PlatformFacturasJobController | `platform/facturas` | Cron job de facturación |
| PlatformImpersonacionController | `platform` | Impersonación de junta |
| PlatformAvisosController | `platform/avisos` | Avisos del dashboard |
| PlatformReportesController | `platform/reportes` | Reportes |

---

## 2. Rutas bajo `platform/juntas`

Tres controllers comparten el path `platform/juntas`. NestJS registra las rutas de cada controller; no hay conflicto porque cada ruta tiene un patrón distinto.

### PlatformJuntasController

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar juntas (paginado) |
| POST | `/` | Crear junta |
| GET | `/:id` | Obtener detalle de junta |
| PATCH | `/:id` | Actualizar junta |
| DELETE | `/:id` | Dar de baja junta |
| GET | `/:id/usuarios` | Listar usuarios de la junta |
| GET | `/:id/resumen` | Resumen (totales, pagos/cartas recientes) |
| GET | `/:id/uso` | Uso vs límites del plan |
| GET | `/:id/alertas` | Alertas de límites |
| GET | `/:id/suscripcion` | Obtener suscripción |
| POST | `/:id/suscripcion` | Crear suscripción |
| PATCH | `/:id/suscripcion` | Actualizar suscripción |
| POST | `/:id/admin/reset-password` | Reset contraseña admin |
| PATCH | `/:id/admin` | Cambiar admin |
| POST | `/:id/admin/reenviar-credenciales` | Reenviar credenciales |
| PATCH | `/:id/admin/bloquear` | Bloquear admin |

### PlatformFacturasController

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/:id/facturas` | Listar facturas de la junta |
| POST | `/:id/facturas` | Crear factura manual |
| GET | `/:id/pagos-plataforma` | Listar pagos registrados |
| POST | `/:id/facturas/:facturaId/pago` | Registrar pago |
| PATCH | `/:id/facturas/:facturaId/cancelar` | Cancelar factura |

### PlatformOperacionesController

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/:id/notas` | Listar notas de soporte |
| POST | `/:id/notas` | Crear nota |
| GET | `/:id/exportar` | Exportar datos (JSON/CSV) |

---

## 3. Orden de registro y conflicto de rutas

**Orden en `PlatformModule`:** Juntas → Auditoria → Dashboard → Planes → Facturas → FacturasJob → Operaciones → Impersonacion → Avisos → Reportes

Las rutas de `platform/juntas` no entran en conflicto porque:

- `GET /:id` solo coincide con `/api/platform/juntas/{uuid}` (un segmento).
- `GET /:id/usuarios`, `GET /:id/facturas`, etc. requieren dos segmentos y tienen un segundo segmento diferente (`usuarios`, `facturas`, `notas`, etc.).

Por tanto, si `GET /:id` se registrara antes que `GET /:id/usuarios`, una petición a `/api/platform/juntas/123/usuarios` no coincidiría con `GET /:id` (que espera un solo segmento tras `juntas`). NestJS/Express hace match por segmentos exactos.

**Recomendación:** Al añadir nuevas rutas bajo `platform/juntas`, usar siempre el patrón `/:id/{recurso}` (ej. `/:id/nuevo-recurso`) para evitar solapamientos con `GET /:id`.

---

## 4. Rutas de otros controllers

- `GET /api/platform/auditoria` – Auditoría
- `GET /api/platform/dashboard` – Dashboard
- `GET /api/platform/planes` – Planes
- `POST /api/platform/facturas/generar-mensuales` – Generar facturas mensuales (job manual)
- `POST /api/platform/impersonar/:juntaId` – Impersonar junta
- `POST /api/platform/salir-impersonacion` – Salir de impersonación
- `GET /api/platform/avisos` – Listar avisos (admin, todos los alcances)
- `POST /api/platform/avisos` – Crear aviso (alcance: PLATAFORMA | TODAS_JUNTAS | JUNTA_ESPECIFICA)
- `PATCH /api/platform/avisos/:id` – Actualizar aviso
- `DELETE /api/platform/avisos/:id` – Eliminar aviso
- `GET /api/avisos` – Avisos activos para junta (TODAS_JUNTAS + JUNTA_ESPECIFICA para la junta del JWT)
- `GET /api/platform/reportes/juntas` – Reporte de juntas
- `GET /api/platform/reportes/facturacion` – Reporte de facturación
- `GET /api/platform/reportes/uso` – Reporte de uso
