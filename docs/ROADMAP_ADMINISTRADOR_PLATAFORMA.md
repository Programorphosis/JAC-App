# Roadmap – Administrador de Plataforma

**Versión:** 1.0  
**Base:** `PLAN_ADMINISTRADOR_PLATAFORMA.md`  
**Principio:** No avanzar de fase sin confirmación explícita. Evaluar cada entrega antes de continuar.

---

## Resumen ejecutivo

| Fase | Área | Objetivo principal | Dependencias |
|------|------|--------------------|--------------|
| PA-1 | Ciclo de vida + Auditoría | Activar/desactivar, soft delete, auditoría plataforma | - |
| PA-2 | Configuración + Gestión admins | Campos Junta, reset password, cambiar admin | PA-1 |
| PA-3 | Métricas y dashboard | Dashboard, resumen junta, uso | PA-1 |
| PA-4 | Suscripciones y planes | Modelo Plan, Suscripción, CRUD | PA-1 |
| PA-5 | Límites y cuotas | Validaciones por plan, alertas | PA-4 |
| PA-6 | Facturación | Facturas, historial pagos plataforma | PA-4 |
| PA-7 | Operaciones y soporte | Notas, exportar, mantenimiento | PA-1 |
| PA-8 | Impersonación | Ver como junta (token temporal) | PA-1 |
| PA-9 | Onboarding y comunicación | Checklist, avisos | PA-4 |
| PA-10 | Seguridad reforzada | 2FA, sesiones, reportes exportables | PA-3 |

---

## PA-1 – Ciclo de vida y auditoría plataforma

**Objetivo:** Juntas activas/inactivas, soft delete, y trazabilidad de acciones PLATFORM_ADMIN.

### Schema

- [x] `Junta.activo Boolean @default(true)`
- [x] `Junta.fechaBaja DateTime?`
- [x] `Junta.estado` (enum: ACTIVA, SUSPENDIDA, ARCHIVADA) – opcional en esta fase; puede usarse solo `activo` al inicio.

### Backend

- [x] `PATCH /platform/juntas/:id` – incluir `activo`, `fechaBaja`
- [x] `DELETE /platform/juntas/:id` – soft delete (activo=false, fechaBaja=now)
- [x] Auditoría: registrar CREACION_JUNTA, ACTUALIZACION_JUNTA, BAJA_JUNTA con `ejecutadoPorId` = platform admin
- [x] `GET /platform/auditoria` – listar auditoría de plataforma (entidad Junta o accion contiene PLATFORM)

### Frontend

- [x] Listado juntas: columna estado (Activa/Inactiva), filtro por estado
- [x] Detalle junta: botón Activar/Desactivar, botón Eliminar (soft) con confirmación
- [x] Vista Auditoría plataforma: tabla de acciones recientes

### Criterio de cierre

- Juntas se pueden desactivar y dar de baja (soft). Auditoría de plataforma visible.

---

## PA-2 – Configuración extendida y gestión de admins

**Objetivo:** Más campos en Junta y control sobre el admin de cada junta.

### Schema

- [x] `Junta.telefono String?`
- [x] `Junta.email String?`
- [x] `Junta.direccion String?`
- [x] `Junta.ciudad String?`
- [x] `Junta.departamento String?`
- [x] `Junta.enMantenimiento Boolean @default(false)`

### Backend

- [x] `PATCH /platform/juntas/:id` – incluir nuevos campos
- [x] `POST /platform/juntas/:id/admin/reset-password` – genera temporal, envía (o muestra) al platform admin
- [x] `PATCH /platform/juntas/:id/admin` – body: `{ nuevoAdminUsuarioId }` para reasignar ADMIN
- [x] `POST /platform/juntas/:id/admin/reenviar-credenciales` – regenera temporal para admin actual
- [x] `PATCH /platform/juntas/:id/admin/bloquear` – desactiva usuario admin

### Frontend

- [x] Formulario junta: campos contacto, región, en mantenimiento
- [x] Detalle junta: sección "Admin de junta" con acciones Reset, Cambiar, Bloquear, Reenviar credenciales

### Criterio de cierre

- Junta editable con datos de contacto. Admin de junta gestionable desde plataforma.

---

## PA-3 – Métricas y dashboard

**Objetivo:** Vista global de la plataforma y resumen por junta.

### Backend

- [x] `GET /platform/dashboard` – total juntas, activas, nuevas este mes, (ingresos si hay facturación)
- [x] `GET /platform/juntas/:id/resumen` – usuarios, pagos recientes, cartas emitidas
- [x] `GET /platform/juntas/:id/uso` – usuarios activos, pagos/mes, cartas/mes, storage (si S3 por junta)

### Frontend

- [x] Dashboard: cards con cifras globales, gráfico juntas nuevas (opcional)
- [x] Detalle junta: pestaña o sección Resumen con métricas
- [x] Detalle junta: pestaña Uso (cuando aplique)

### Criterio de cierre

- Dashboard con métricas básicas. Resumen por junta visible.

---

## PA-4 – Suscripciones y planes

**Objetivo:** Modelo Plan y Suscripción por junta.

### Schema

- [x] `Plan` (id, nombre, precioMensual, precioAnual, limiteUsuarios, limiteStorageMb, limiteCartasMes, diasPrueba)
- [x] `Suscripcion` (juntaId, planId, fechaInicio, fechaVencimiento, estado: ACTIVA|SUSPENDIDA|CANCELADA|PRUEBA|VENCIDA)
- [x] Migración: crear planes base (Básico, Premium, etc.)

### Backend

- [x] `GET /platform/planes` – listar planes
- [x] `GET /platform/juntas/:id/suscripcion` – suscripción actual
- [x] `POST /platform/juntas/:id/suscripcion` – crear suscripción (al crear junta o manual)
- [x] `PATCH /platform/juntas/:id/suscripcion` – cambiar plan, renovar, cancelar
- [x] Integrar en `JuntaService.createJunta`: crear Suscripción con plan por defecto y días de prueba si aplica

### Frontend

- [x] Listado planes (vista simple)
- [x] Crear junta: selector de plan, días de prueba
- [x] Detalle junta: sección Suscripción (plan, fechas, estado, cambiar plan)

### Criterio de cierre

- Cada junta tiene suscripción. Planes configurables. Creación de junta asigna plan.

---

## PA-5 – Límites y cuotas

**Objetivo:** Motor centralizado de límites SaaS con planes estándar, ilimitados y personalizados.

**Plan detallado:** `Motor de Límites, Cuotas y Planes Personalizados.md`  
**Roadmap:** `ROADMAP_PA5_LIMITES.md`

### Estado actual

- [x] `LimitesService` base (validarCrearUsuario, validarEmitirCarta, validarStorage)
- [x] Integrado en UsersService y Cartas
- [x] `GET /platform/juntas/:id/alertas`
- [x] Frontend: barras de progreso y alertas en junta-detail
- [ ] Integrado en upload documentos
- [ ] Storage real (Documento.sizeBytes)
- [ ] Overrides por suscripción
- [ ] Flags ilimitados en Plan
- [ ] Política de vencimiento

### Backend (pendiente)

- [ ] Enriquecer Plan (flags ilimitados, descripcion, esPersonalizable)
- [ ] Enriquecer Suscripción (overrides, esPlanPersonalizado, precioPersonalizado)
- [ ] Documento.sizeBytes; cálculo storage real
- [ ] Refactor LimitesService: límites efectivos, overrides, ilimitados, vencimiento
- [ ] Integrar validarStorage en DocumentosService

### Frontend (pendiente)

- [ ] Usar límites efectivos (con overrides) en lugar de plan directo
- [ ] Indicador plan personalizado
- [ ] Niveles alerta 80% / 95% / 100%
- [ ] Dashboard: juntas cercanas a límite, juntas vencidas

### Criterio de cierre

- Límites aplicados en todas las operaciones críticas. Storage real. Overrides y planes personalizados operativos. Alertas y bloqueo por vencimiento.

---

## PA-6 – Facturación

**Objetivo:** Facturas y pagos de juntas al proveedor.

### Schema

- [x] `Factura` (juntaId, monto, fechaEmision, fechaVencimiento, estado, referenciaExterna, metadata)
- [x] `PagoFactura` (facturaId, monto, fecha, metodo, referencia) – opcional

### Backend

- [x] `GET /platform/juntas/:id/facturas` – listar facturas de junta
- [x] `POST /platform/juntas/:id/facturas` – crear factura (manual o por job)
- [x] `GET /platform/juntas/:id/pagos-plataforma` – historial pagos
- [ ] Job: generar facturas mensuales por suscripciones activas (opcional)

### Frontend

- [x] Detalle junta: pestaña Facturación (lista facturas, estado)
- [x] Crear factura manual
- [x] Vista historial pagos

### Pago online (implementado)

- [x] Pago online de facturas (junta paga con tarjeta vía Wompi). Ver `FACTURACION_PLATAFORMA_PAGO_ONLINE_ANALISIS.md`.

### Criterio de cierre

- Facturas por junta. Historial de pagos al proveedor.

---

## PA-7 – Operaciones y soporte

**Objetivo:** Notas internas, exportar datos, modo mantenimiento.

### Schema

- [x] `NotaJunta` (juntaId, contenido, creadoPorId, fechaCreacion)

### Backend

- [x] `GET /platform/juntas/:id/notas` – listar notas
- [x] `POST /platform/juntas/:id/notas` – crear nota
- [x] `GET /platform/juntas/:id/exportar` – exportar datos junta (JSON/CSV según definición)
- [x] `Junta.enMantenimiento` – ya en PA-2; validar en login que junta no esté en mantenimiento

### Frontend

- [x] Detalle junta: pestaña Notas (soporte)
- [x] Botón Exportar datos
- [x] Toggle Modo mantenimiento en edición

### Criterio de cierre

- Notas por junta. Exportación funcional. Mantenimiento bloquea acceso.

---

## PA-8 – Impersonación

**Objetivo:** Platform admin puede ver la app como una junta (solo lectura o limitado).

### Backend

- [x] `POST /platform/impersonar/:juntaId` – genera JWT temporal con juntaId de esa junta, rol limitado (solo lectura)
- [x] `POST /platform/salir-impersonacion` – volver al token normal
- [x] Auditoría: registrar IMPERSONACION_INICIO, IMPERSONACION_FIN

### Frontend

- [x] Botón "Ver como junta" en detalle junta
- [x] Banner visible cuando está en modo impersonación
- [x] Botón "Salir de impersonación"

### Criterio de cierre

- Impersonación funcional con auditoría. Uso seguro y limitado.

---

## PA-9 – Onboarding y comunicación

**Objetivo:** Checklist de activación y avisos generales.

### Schema

- [x] `AvisoPlataforma` (id, titulo, contenido, fechaPublicacion, activo)
- [ ] Checklist: puede ser metadata en Junta o tabla separada (opcional)

### Backend

- [x] `GET /platform/avisos` – avisos activos
- [x] `POST /platform/avisos` – crear aviso
- [ ] `GET /platform/juntas/:id/checklist` – estado checklist (opcional)
- [ ] `PATCH /platform/juntas/:id/checklist` – marcar paso completado (opcional)

### Frontend

- [x] Dashboard: sección Avisos
- [x] Diálogo crear aviso
- [ ] Detalle junta: checklist de activación (si se implementa)

### Criterio de cierre

- Avisos visibles. Checklist operativo si se define.

---

## PA-10 – Seguridad reforzada

**Objetivo:** 2FA para platform admin, sesiones, reportes exportables.

### Backend

- [ ] 2FA para usuarios PLATFORM_ADMIN (TOTP)
- [ ] `GET /platform/sesiones` – sesiones activas del platform admin
- [ ] `DELETE /platform/sesiones/:id` – revocar sesión
- [x] `GET /platform/reportes/juntas` – export CSV
- [x] `GET /platform/reportes/facturacion` – export CSV
- [x] `GET /platform/reportes/uso` – export CSV

### Frontend

- [ ] Configuración 2FA en perfil platform admin
- [ ] Vista Sesiones activas
- [x] Botones exportar reportes (juntas, facturación, uso) en dashboard

### Criterio de cierre

- 2FA opcional. Sesiones gestionables. Reportes exportables.

---

## Matriz de dependencias

```
PA-1 (Ciclo vida + Auditoría)
    ├── PA-2 (Config + Admins)
    ├── PA-3 (Métricas)
    ├── PA-7 (Operaciones)
    └── PA-8 (Impersonación)
PA-4 (Suscripciones)
    ├── PA-5 (Límites)
    ├── PA-6 (Facturación)
    └── PA-9 (Onboarding)
PA-3 ──→ PA-10 (Reportes export)
```

---

## Orden sugerido de implementación

1. **PA-1** – Base: ciclo de vida y auditoría
2. **PA-2** – Configuración y gestión admins
3. **PA-3** – Métricas y dashboard
4. **PA-4** – Suscripciones y planes
5. **PA-5** – Límites y cuotas
6. **PA-6** – Facturación
7. **PA-7** – Operaciones y soporte
8. **PA-8** – Impersonación
9. **PA-9** – Onboarding y comunicación
10. **PA-10** – Seguridad reforzada

---

## Referencias

- `PLAN_ADMINISTRADOR_PLATAFORMA.md` – Plan completo
- `flujoBootstrapYOnboarding.md` – Bootstrap y creación juntas
- `ROADMAP.md` – Roadmap general del sistema
- `WOMPI_POR_JUNTA_ROADMAP.md` – Roadmap exclusivo: credenciales Wompi por junta (cada junta recibe su dinero)
