# Fase 3 – Application Layer e infraestructura base

**Fecha:** Febrero 2025  
**Referencia:** ROADMAP.md § Fase 3, 00_ARQUITECTURA_RECTOR copy.md, convencionesAPI.md

---

## 1. Objetivo cumplido

Casos de uso que orquestan dominio, auth y multi-tenant. DTO → validación → llamada a Domain/Prisma → auditoría cuando corresponda.

---

## 2. Alineación con ROADMAP

### 3.1 Autenticación y autorización

| Requisito ROADMAP | Implementado | Detalle |
|------------------|--------------|---------|
| JWT con `userId`, `juntaId` (null para Platform Admin), `roles` | ✓ | Payload: sub, juntaId, roles, tipo |
| Nunca `juntaId` desde frontend para autorización | ✓ | juntaId siempre del token; operaciones usan `req.user.juntaId` |
| Refresh token rotativo | ✓ | POST /api/auth/refresh devuelve nuevos tokens |
| Guards por rol | ✓ | PlatformAdminGuard, JuntaGuard, RolesGuard |
| PLATFORM_ADMIN solo /api/platform/* | ✓ | PlatformController con PlatformAdminGuard |
| Operaciones de junta exigen juntaId | ✓ | JuntaGuard rechaza si juntaId es null |
| Middleware: extraer juntaId del token | ✓ | JwtStrategy valida y carga usuario; juntaId en request.user |

**Nota sobre login:** El `LoginDto` tiene `juntaId` opcional para identificar el contexto (Platform Admin: juntaId null; usuario de junta: puede omitirse si único). El backend nunca confía en juntaId del body para autorizar; solo para encontrar el usuario correcto en el login.

### 3.2 Módulos Application

| Módulo | Requisito ROADMAP | Implementado |
|--------|-------------------|--------------|
| **users** | CRUD; solo ADMIN/SECRETARIA; filtro por juntaId | ✓ |
| **historial_laboral** | Alta (sin editar históricos); usado por DebtService | ✓ |
| **tarifas** | Alta/consulta versionadas por junta y fecha | ✓ |
| **auth** | Login, refresh, permisos | ✓ |

---

## 3. Autenticación y autorización (detalle)

### JWT

- **Payload:** `sub` (userId), `juntaId` (null para Platform Admin), `roles`, `tipo` (access | refresh)
- **Access token:** 15 min
- **Refresh token:** 7 días, rotativo (cada refresh devuelve nuevos tokens)

### Guards

| Guard | Uso |
|-------|-----|
| `AuthGuard('jwt')` | Exige token válido |
| `PlatformAdminGuard` | Solo PLATFORM_ADMIN con juntaId null (rutas /api/platform/*) |
| `JuntaGuard` | Exige juntaId no null (operaciones de junta) |
| `RolesGuard` | Exige al menos un rol de la lista |

### Decorador

- `@Roles(RolNombre.ADMIN, RolNombre.SECRETARIA)` – roles requeridos (usa enums de Prisma)

### Endpoints auth

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Login (tipoDocumento, numeroDocumento, password, juntaId?) |
| POST | /api/auth/refresh | Renovar tokens (body: refreshToken) |
| GET | /api/auth/me | Perfil del usuario autenticado |

---

## 4. Módulos Application (detalle)

### 4.1 Users

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | /api/usuarios | ADMIN, SECRETARIA | Listar usuarios de la junta (paginado: page, limit) |
| GET | /api/usuarios/:id | ADMIN, SECRETARIA | Obtener usuario |
| POST | /api/usuarios | ADMIN, SECRETARIA | Crear usuario (password, roles opcionales) |
| PATCH | /api/usuarios/:id | ADMIN, SECRETARIA | Actualizar (nombres, apellidos, telefono, direccion, activo) |

- **Filtro:** Siempre por `juntaId` del token
- **Auditoría:** CREACION_USUARIO, ACTUALIZACION_USUARIO
- **CreateUserDto:** roles opcionales; si no se envían, default CIUDADANO. No permite PLATFORM_ADMIN.
- **UpdateUserDto:** No permite cambiar roles (alineado a ROADMAP).

### 4.2 Historial laboral

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | /api/usuarios/:usuarioId/historial-laboral | ADMIN, SECRETARIA, TESORERA | Listar registros |
| POST | /api/usuarios/:usuarioId/historial-laboral | ADMIN, SECRETARIA | Alta (sin editar históricos) |

- **DTO:** estado (TRABAJANDO | NO_TRABAJANDO), fechaInicio, fechaFin?
- **Auditoría:** ALTA_HISTORIAL_LABORAL
- **Validación:** Usuario debe pertenecer a la junta del token

### 4.3 Tarifas

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | /api/tarifas | ADMIN, SECRETARIA, TESORERA | Listar (filtro estadoLaboral opcional) |
| POST | /api/tarifas | ADMIN, SECRETARIA | Alta tarifa versionada |

- **DTO:** estadoLaboral, valorMensual, fechaVigencia
- **Auditoría:** ALTA_TARIFA
- **Orden:** Por fechaVigencia desc (más recientes primero)

---

## 5. Validación global

- **ValidationPipe:** whitelist, forbidNonWhitelisted, transform (main.ts)
- DTOs con class-validator (IsString, IsIn, IsDateString, etc.)

---

## 6. Estructura de archivos

```
auth/
├── decorators/
│   └── roles.decorator.ts       # @Roles, RolNombre desde @prisma/client
├── guards/
│   ├── platform-admin.guard.ts
│   ├── junta.guard.ts
│   └── roles.guard.ts
├── dto/
│   └── login.dto.ts
├── strategies/
│   └── jwt.strategy.ts
├── auth.controller.ts
├── auth.service.ts
└── auth.module.ts

application/
├── users/
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── historial-laboral/
│   ├── dto/
│   │   └── create-historial-laboral.dto.ts
│   ├── historial-laboral.controller.ts
│   ├── historial-laboral.service.ts
│   └── historial-laboral.module.ts
├── tarifas/
│   ├── dto/
│   │   └── create-tarifa.dto.ts
│   ├── tarifas.controller.ts
│   ├── tarifas.service.ts
│   └── tarifas.module.ts
├── bootstrap/                   # Fase 0.5/1
├── junta/                       # Fase 0.5/1
└── ...

platform/                        # Fase 0.5/1
├── platform.controller.ts       # /api/platform/juntas
└── platform.service.ts
```

---

## 7. Multi-tenant y seguridad

| Regla | Cumplimiento |
|-------|---------------|
| Toda consulta filtra por juntaId | ✓ Users, historial, tarifas usan juntaId del token |
| juntaId nunca desde body en operaciones | ✓ Solo desde req.user.juntaId |
| Platform Admin aislado | ✓ Solo rutas /api/platform/*; JuntaGuard bloquea en rutas de junta |
| Auditoría en acciones críticas | ✓ Creación usuario, actualización usuario, alta historial, alta tarifa |

---

## 8. Convenciones API

- **Prefijo global:** /api
- **Respuestas:** `{ data, meta: { timestamp } }`
- **Códigos HTTP:** 200, 201, 400, 401, 403, 404 según convencionesAPI.md

---

## 9. Ajustes post-implementación

| Ajuste | Motivo |
|--------|--------|
| tsconfig: moduleResolution "node", module "commonjs" | Compatibilidad con enums de @prisma/client (antes nodenext causaba errores de importación) |
| Enums de Prisma como única fuente de verdad | RolNombre, TipoPago, MetodoPago, EstadoAguaTipo, TipoCambioAgua importados desde @prisma/client |

---

## 10. Deuda técnica / pendiente (fuera de Fase 3)

| Item | Descripción |
|------|-------------|
| Revocación de tokens en DB | ROADMAP: "si se define". No implementado. |
| RECEPTOR_AGUA, CIUDADANO | Guards por rol definidos; módulos específicos (agua, cartas) en Fases 6 y 7. |

---

## 11. Criterio de cierre (ROADMAP)

> Login/refresh y al menos un módulo (ej. usuarios) funcionando con guards y juntaId.

- [x] JWT con userId, juntaId, roles
- [x] Refresh token rotativo
- [x] Guards por rol (PlatformAdmin, Junta, Roles)
- [x] Módulo users (CRUD completo)
- [x] Módulo historial_laboral (listar + alta)
- [x] Módulo tarifas (listar + alta)
- [x] Auth: login, refresh, me

**Fase 3 cerrada.**
