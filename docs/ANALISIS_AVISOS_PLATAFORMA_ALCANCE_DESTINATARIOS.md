# Análisis: Alcance de destinatarios en avisos de plataforma

**Objetivo:** Permitir que el Platform Admin elija si un aviso va a "todos" o "solo operativos" (opción C).

---

## 1. Estado actual

### 1.1 Modelo de datos (Prisma)

```prisma
enum AlcanceAviso {
  PLATAFORMA      // Solo platform admins
  TODAS_JUNTAS    // Todas las juntas
  JUNTA_ESPECIFICA // Una junta concreta
}

model AvisoPlataforma {
  id, titulo, contenido, fechaPublicacion, activo
  alcance    AlcanceAviso  @default(TODAS_JUNTAS)
  juntaId    String?      // Solo si alcance = JUNTA_ESPECIFICA
}
```

**No existe** hoy un campo que distinga "todos los usuarios" vs "solo operativos".

### 1.2 Flujo de visibilidad actual

| Alcance           | Quién ve el aviso                                      |
|-------------------|--------------------------------------------------------|
| PLATAFORMA        | Solo Platform Admin (en su dashboard)                  |
| TODAS_JUNTAS      | **Todos** los usuarios de cualquier junta              |
| JUNTA_ESPECIFICA  | **Todos** los usuarios de esa junta                    |

No hay filtro por rol. Un AFILIADO ve los mismos avisos que un ADMIN.

### 1.3 Puntos de consumo

| Lugar                    | Endpoint / origen              | Usuarios que llegan |
|--------------------------|--------------------------------|---------------------|
| Página `/app/avisos`     | GET /api/avisos + /api/avisos-junta | Todos (auth + junta) |
| Modal al iniciar sesión  | GET /api/avisos + /api/avisos-junta | Todos (auth + junta) |

Ambos usan el mismo `GET /api/avisos`, que devuelve avisos sin filtrar por rol.

### 1.4 Backend – cadena de llamadas

```
PlatformAvisosPublicController.listarActivos(req)
  → user = req.user (JwtUser: id, juntaId, roles, ...)
  → PlatformAvisosService.listarActivos(user.juntaId)
  → Prisma: where activo AND (alcance=TODAS_JUNTAS OR (alcance=JUNTA_ESPECIFICA AND juntaId))
  → return avisos (sin filtrar por roles)
```

El controller **no pasa** `user` al service; solo `juntaId`. El service no tiene información de roles.

### 1.5 Frontend – Platform Admin (crear/editar aviso)

- **aviso-crear-dialog**: alcance (PLATAFORMA, TODAS_JUNTAS, JUNTA_ESPECIFICA) + juntaId si aplica.
- **aviso-editar-dialog**: mismo esquema.
- **No hay** opción "solo operativos" / "todos".

---

## 2. Definición de "operativos"

Roles considerados operativos (MATRIZ_PERMISOS_ROLES.md):

| Rol           | Operativo | Motivo                          |
|---------------|-----------|----------------------------------|
| ADMIN         | Sí        | Configuración y gestión          |
| SECRETARIA    | Sí        | Cartas, usuarios                 |
| TESORERA      | Sí        | Pagos, tarifas                   |
| FISCAL        | Sí        | Control y vigilancia             |
| RECEPTOR_AGUA | Sí        | Modificador de requisitos        |
| AFILIADO      | No        | Solo autogestión (pagar, carta) |

**Regla:** Si el usuario tiene **al menos un rol operativo**, ve avisos con `soloOperativos=true`. Si solo tiene AFILIADO, no los ve.

---

## 3. Cambios necesarios para opción C

### 3.1 Base de datos

**Nuevo campo en `AvisoPlataforma`:**

```prisma
soloOperativos  Boolean  @default(false)
```

- `false` (por defecto): todos los usuarios de la junta(s) ven el aviso.
- `true`: solo usuarios con rol operativo (ADMIN, SECRETARIA, TESORERA, FISCAL, RECEPTOR_AGUA).

**Relevancia por alcance:**

| Alcance           | soloOperativos aplica |
|-------------------|------------------------|
| PLATAFORMA        | No (solo platform admins) |
| TODAS_JUNTAS      | Sí                     |
| JUNTA_ESPECIFICA  | Sí                     |

Para PLATAFORMA, `soloOperativos` se ignora (o no se muestra en el formulario).

### 3.2 Backend

| Archivo                         | Cambio                                                                 |
|---------------------------------|------------------------------------------------------------------------|
| `prisma/schema.prisma`          | Añadir `soloOperativos Boolean @default(false)` en AvisoPlataforma     |
| Migración                       | `ALTER TABLE "AvisoPlataforma" ADD COLUMN "soloOperativos" BOOLEAN NOT NULL DEFAULT false` |
| `crear-aviso.dto.ts`            | Añadir `soloOperativos?: boolean` (opcional)                           |
| `actualizar-aviso.dto.ts`       | Añadir `soloOperativos?: boolean` (opcional)                           |
| `platform-avisos.service.ts`   | En `crear` y `actualizar`, persistir `soloOperativos`                   |
| `platform-avisos.service.ts`   | En `listarActivos(juntaId, userRoles)`: filtrar avisos con `soloOperativos=true` cuando el usuario no es operativo |
| `platform-avisos-public.controller.ts` | Pasar `user` (o `user.roles`) a `listarActivos`                 |

**Lógica de filtrado en `listarActivos`:**

```ts
// Pseudocódigo
function esUsuarioOperativo(roles: RolNombre[]): boolean {
  const operativos = ['ADMIN','SECRETARIA','TESORERA','FISCAL','RECEPTOR_AGUA'];
  return roles.some(r => operativos.includes(r));
}

avisos = avisos.filter(a => {
  if (!a.soloOperativos) return true;
  return esUsuarioOperativo(user.roles);
});
```

### 3.3 Frontend – Platform Admin

| Archivo                    | Cambio                                                                 |
|----------------------------|------------------------------------------------------------------------|
| `aviso-crear-dialog`       | Si alcance ∈ {TODAS_JUNTAS, JUNTA_ESPECIFICA}, mostrar checkbox "Solo visible para usuarios operativos (admin, secretaria, tesorera, fiscal)" |
| `aviso-editar-dialog`      | Igual                                                                  |
| `platform-avisos.service`  | Incluir `soloOperativos` en crear/actualizar                            |
| `AvisoPlataforma` interface| Añadir `soloOperativos?: boolean`                                       |

### 3.4 Frontend – consumidores

| Archivo                    | Cambio                                                                 |
|----------------------------|------------------------------------------------------------------------|
| `AvisosService` (core)     | Sin cambios (GET /api/avisos ya filtra en backend)                     |
| `avisos-sesion.service`   | Sin cambios (usa GET /api/avisos)                                      |
| `avisos-list.component`   | Sin cambios (usa AvisosService)                                        |

El filtrado se hace en backend; el frontend no necesita lógica adicional.

---

## 4. Compatibilidad y migración

- **Avisos existentes:** `soloOperativos = false` por defecto → se mantiene el comportamiento actual (todos los ven).
- **Sin breaking changes** en la API pública.
- **Platform Admin:** los avisos existentes se pueden editar para activar "solo operativos" si se desea.

---

## 5. Resumen de archivos a tocar

| Capa     | Archivos                                                                 |
|----------|---------------------------------------------------------------------------|
| Prisma   | schema.prisma, migración                                                  |
| Backend  | crear-aviso.dto, actualizar-aviso.dto, platform-avisos.service, platform-avisos-public.controller |
| Frontend | aviso-crear-dialog, aviso-editar-dialog, platform-avisos.service (interface) |

---

## 6. Orden de implementación sugerido

1. Prisma: añadir campo + migración.
2. Backend: DTOs, service (crear/actualizar + filtrado en listarActivos), controller (pasar user).
3. Frontend: checkbox en crear/editar, actualizar DTO en service.
4. Pruebas: afiliado no ve avisos con soloOperativos; operativo sí los ve.
