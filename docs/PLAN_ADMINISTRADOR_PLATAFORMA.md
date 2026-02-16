# Plan del Administrador de Plataforma – Sistema JAC

**Versión:** 1.0  
**Objetivo:** Control completo de la plataforma como negocio SaaS: gestión de juntas (tenants), suscripciones, facturación, métricas y operaciones.  
**Principio:** Módulos bien definidos y separados (frontend y backend) para facilitar futura migración a microservicios o frontend separado.

---

## 1. Contexto y alcance

### 1.1 Qué gestiona el Platform Admin

- **Las juntas en sí** (tenants): crear, editar, suspender, eliminar.
- **El negocio de la plataforma**: suscripciones, facturación, planes, límites.
- **Operaciones de soporte**: reset de contraseñas, impersonación, auditoría.
- **Métricas y reportes**: uso, ingresos, estado de la plataforma.

### 1.2 Qué NO gestiona

- Operación interna de ninguna junta (usuarios, pagos, cartas, requisitos).
- Esa gestión la hace cada ADMIN/SECRETARIA/TESORERA de su junta.

### 1.3 Arquitectura

| Aspecto | Decisión |
|---------|----------|
| **Base de datos** | Misma PostgreSQL, mismo esquema. |
| **Backend** | Módulo `platform` separado; rutas `/api/platform/*`; guard PLATFORM_ADMIN. |
| **Frontend** | Módulo `PlatformModule` separado; rutas `/platform/*`; guard PLATFORM_ADMIN. |
| **App** | Misma app Angular y NestJS. Módulos autocontenidos para futura extracción. |
| **Migración futura** | Diseño permite extraer `platform` a microservicio o frontend separado sin reescribir lógica. |

---

## 2. Funcionalidades (10 áreas)

### 2.1 Ciclo de vida de juntas

| Funcionalidad | Descripción | Schema | Endpoints |
|---------------|-------------|--------|-----------|
| Activar/Desactivar | Campo `activo` en Junta. Suspender sin borrar. | `Junta.activo Boolean @default(true)` | `PATCH /platform/juntas/:id` (activo) |
| Eliminar junta | Soft delete: `activo=false` + `fechaBaja`. No hard delete por auditoría. | `Junta.fechaBaja DateTime?` | `DELETE /platform/juntas/:id` (soft) |
| Archivar | Estado `archivada` para juntas que ya no operan. | `Junta.estado Enum?` (ACTIVA, SUSPENDIDA, ARCHIVADA) | `PATCH /platform/juntas/:id` (estado) |

**Reglas:** No eliminar juntas con datos históricos. Soft delete obligatorio. Auditoría en toda modificación.

---

### 2.2 Suscripciones y planes

| Funcionalidad | Descripción | Schema | Endpoints |
|---------------|-------------|--------|-----------|
| Planes | Básico, Premium, etc. | `Plan` (id, nombre, precioMensual, precioAnual, limites...) | `GET /platform/planes` |
| Suscripción por junta | Plan, fechas, estado | `Suscripcion` (juntaId, planId, fechaInicio, fechaVencimiento, estado) | `GET/POST/PATCH /platform/juntas/:id/suscripcion` |
| Período de prueba | Días trial al crear junta | Campo en Plan o en CreateJunta | En `POST /platform/juntas` |
| Renovación | Recordatorios, renovación manual/automática | Job cron + notificaciones | - |
| Cambio de plan | Upgrade/downgrade | `PATCH /platform/juntas/:id/suscripcion` | - |

**Estados suscripción:** ACTIVA, SUSPENDIDA, CANCELADA, PRUEBA, VENCIDA.

---

### 2.3 Facturación y cobro

| Funcionalidad | Descripción | Schema | Endpoints |
|---------------|-------------|--------|-----------|
| Facturación | Facturas por junta al proveedor | `Factura` (juntaId, monto, fecha, estado, referencia) | `GET /platform/juntas/:id/facturas`, `POST` (crear) |
| Historial de pagos | Pagos que la junta hace al proveedor | `PagoPlataforma` o extensión de Factura | `GET /platform/juntas/:id/pagos-plataforma` |
| Métodos de pago | Por junta (tarjeta, transferencia) | `MetodoPagoJunta` (opcional, fase posterior) | - |
| Precios por plan | Monto mensual/anual | En `Plan` | - |

---

### 2.4 Límites y cuotas

| Funcionalidad | Descripción | Schema | Endpoints |
|---------------|-------------|--------|-----------|
| Límite usuarios | Máximo por junta según plan | En `Plan.limiteUsuarios` | Validación en crear usuario |
| Límite almacenamiento | MB/GB documentos (S3) | En `Plan.limiteStorageMb`; cálculo por junta | `GET /platform/juntas/:id/uso` |
| Límite cartas/mes | Si aplica por plan | En `Plan.limiteCartasMes` | Validación en emitir carta |
| Alertas | Avisos al acercarse a límites | Notificaciones / dashboard | - |

---

### 2.5 Configuración por junta

| Funcionalidad | Descripción | Schema | Endpoints |
|---------------|-------------|--------|-----------|
| Vigencia carta | `vigenciaCartaMeses` (ya existe) | Junta | `PATCH /platform/juntas/:id` |
| Datos contacto | Teléfono, email, dirección junta | `Junta.telefono`, `email`, `direccion` | - |
| Región/ciudad | Para reportes | `Junta.ciudad`, `Junta.departamento` | - |
| Config Wompi | Keys por junta (si cada una tiene cuenta) | `Junta.wompiPublicKey`, `wompiPrivateKey` (encriptados) | - |
| Branding | Logo, colores (white-label) | `Junta.logoUrl`, `colorPrimario` | Fase posterior |

---

### 2.6 Gestión de admins de junta

| Funcionalidad | Descripción | Schema | Endpoints |
|---------------|-------------|--------|-----------|
| Reset contraseña | Forzar cambio al admin de junta | - | `POST /platform/juntas/:id/admin/reset-password` |
| Cambiar admin | Reasignar rol ADMIN a otro usuario | - | `PATCH /platform/juntas/:id/admin` |
| Reenviar credenciales | Regenerar temporal al crear | - | `POST /platform/juntas/:id/admin/reenviar-credenciales` |
| Bloquear admin | Desactivar usuario sin tocar junta | Usuario.activo | `PATCH /platform/juntas/:id/admin/bloquear` |

---

### 2.7 Métricas y reportes

| Funcionalidad | Descripción | Schema | Endpoints |
|---------------|-------------|--------|-----------|
| Dashboard plataforma | Total juntas, activas, nuevas, ingresos | - | `GET /platform/dashboard` |
| Resumen por junta | Usuarios, pagos recientes, cartas | - | `GET /platform/juntas/:id/resumen` |
| Uso por junta | Usuarios activos, pagos/mes, cartas/mes, storage | - | `GET /platform/juntas/:id/uso` |
| Reportes exportables | CSV/Excel juntas, facturación, uso | - | `GET /platform/reportes/juntas`, `.../facturacion`, `.../uso` |
| Auditoría plataforma | Acciones PLATFORM_ADMIN | Auditoria (juntaId=null o entidad=Platform) | `GET /platform/auditoria` |

---

### 2.8 Operaciones y soporte

| Funcionalidad | Descripción | Schema | Endpoints |
|---------------|-------------|--------|-----------|
| Impersonación | Ver app "como" una junta (solo lectura o limitado) | - | `POST /platform/impersonar/:juntaId` (token temporal) |
| Notas internas | Comentarios sobre junta (soporte) | `NotaJunta` (juntaId, contenido, creadoPor, fecha) | `GET/POST /platform/juntas/:id/notas` |
| Exportar datos junta | Backup para cumplimiento/migración | - | `GET /platform/juntas/:id/exportar` |
| Modo mantenimiento | Deshabilitar acceso temporalmente | `Junta.enMantenimiento Boolean` | `PATCH /platform/juntas/:id` |

---

### 2.9 Onboarding y comunicación

| Funcionalidad | Descripción | Schema | Endpoints |
|---------------|-------------|--------|-----------|
| Checklist activación | Pasos para junta operativa | `ChecklistJunta` o metadata | - |
| Comunicaciones | Avisos, mantenimiento, novedades | `AvisoPlataforma` (opcional) | `GET /platform/avisos` |
| Documentación | Links/ayuda por junta/plan | - | - |

---

### 2.10 Seguridad y auditoría

| Funcionalidad | Descripción | Schema | Endpoints |
|---------------|-------------|--------|-----------|
| Auditoría plataforma | Acciones PLATFORM_ADMIN trazadas | Auditoria | `GET /platform/auditoria` |
| 2FA Platform Admin | Opcional, mayor seguridad | Usuario (campo 2FA) | - |
| Sesiones | Ver/revocar sesiones activas | - | `GET /platform/sesiones` |

---

## 3. Estructura de módulos

### 3.1 Backend (NestJS)

```
src/
  platform/                    # Módulo autocontenido
    platform.module.ts
    platform.controller.ts      # Rutas base /platform
    platform.service.ts
    juntas/
      juntas-platform.controller.ts
      juntas-platform.service.ts
    suscripciones/
    facturacion/
    dashboard/
    auditoria-platform/
    ...
  application/
    junta/                     # JuntaService (crear junta) - ya existe
```

Todas las rutas bajo `@Controller('platform/...')` con `PlatformAdminGuard`.

### 3.2 Frontend (Angular)

```
app/
  features/
    platform/                  # Módulo autocontenido
      platform.component.ts    # Layout /platform
      platform-dashboard/
      juntas-list/
      junta-detail/
      junta-nueva/
      suscripciones/
      facturacion/
      reportes/
      auditoria/
      ...
```

Rutas bajo `/platform/*` con `platformAdminGuard`. Sin dependencias de módulos de junta (usuarios, pagos, etc.) salvo servicios HTTP compartidos.

---

## 4. Dependencias entre áreas

```
2.1 Ciclo de vida     → Base para todo (activo, estado)
2.2 Suscripciones    → Depende de 2.1; base para 2.3, 2.4
2.3 Facturación      → Depende de 2.2
2.4 Límites          → Depende de 2.2; validaciones en otros módulos
2.5 Configuración    → Independiente; amplía Junta
2.6 Gestión admins   → Independiente
2.7 Métricas         → Depende de datos existentes (juntas, pagos, etc.)
2.8 Operaciones      → Independiente
2.9 Onboarding       → Complementario
2.10 Seguridad       → Transversal; auditoría desde el inicio
```

---

## 5. Referencias

| Documento | Uso |
|-----------|-----|
| `flujoBootstrapYOnboarding.md` | Bootstrap, creación juntas, credenciales |
| `00_ARQUITECTURA_RECTOR copy.md` | Multi-tenant, PLATFORM_ADMIN |
| `SCHEMA BASE v1.md` | Modelo de datos |
| `convencionesAPI.md` | Contrato de API |
| `ROADMAP_ADMINISTRADOR_PLATAFORMA.md` | Orden de implementación |
