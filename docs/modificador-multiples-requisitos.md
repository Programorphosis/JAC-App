# Modificador de múltiples requisitos – Especificación técnica

**Estado:** Implementado (2026-02-15)

**Objetivo:** Permitir que un usuario sea modificador de varios requisitos a la vez (ej. Agua y Basura).

**Referencia:** flujoRequisitosAdicionales.md, análisis de JAC reales.

---

## 1. Estado anterior (antes de implementar)

| Elemento | Implementación actual |
|----------|------------------------|
| **Schema** | `Usuario.requisitoTipoId` (String? @unique) – un solo requisito por usuario |
| **RequisitoTipo** | `modificadorId` → Usuario (muchos RequisitoTipos pueden apuntar al mismo Usuario) |
| **Sincronización** | Al asignar: `Usuario.esModificador=true`, `Usuario.requisitoTipoId=id` |
| **Validación** | `validarUsuarioPuedeSerModificador` rechaza si ya es modificador de otro |
| **Permisos** | `modificadorId === actor.id` por requisito (ya soporta múltiples) |

---

## 2. Cambios implementados

### 2.1 Schema (Prisma)

**Eliminar:** `Usuario.requisitoTipoId` y `Usuario.esModificador` como campos almacenados.

**Fuente de verdad:** `RequisitoTipo.modificadorId`. Si un RequisitoTipo tiene `modificadorId = X`, el usuario X es modificador de ese requisito.

**Eliminar de Usuario:**
```prisma
// ELIMINAR
esModificador     Boolean  @default(false)
requisitoTipoId   String?  @unique
requisitoTipo     RequisitoTipo? @relation("UsuarioComoModificador", ...)
```

**Eliminar de RequisitoTipo:**
```prisma
// ELIMINAR
usuarioComoModificador Usuario? @relation("UsuarioComoModificador")
```

**Mantener:** `Usuario.requisitosComoModificador RequisitoTipo[]` – relación inversa de `RequisitoTipo.modificadorId`. Permite consultar los requisitos que puede modificar un usuario.

---

### 2.2 Migración SQL

```sql
-- 1. Eliminar índice único y FK de Usuario.requisitoTipoId
ALTER TABLE "Usuario" DROP CONSTRAINT IF EXISTS "Usuario_requisitoTipoId_fkey";
DROP INDEX IF EXISTS "Usuario_requisitoTipoId_key";

-- 2. Eliminar columnas
ALTER TABLE "Usuario" DROP COLUMN IF EXISTS "requisitoTipoId";
ALTER TABLE "Usuario" DROP COLUMN IF EXISTS "esModificador";
```

---

### 2.3 Backend – cambios por archivo

#### `jwt.strategy.ts`

- Cargar `requisitoTipoIds` desde `RequisitoTipo` donde `modificadorId = usuario.id` (o usar `usuario.requisitosComoModificador`).
- `JwtUser`: cambiar `requisitoTipoId: string | null` → `requisitoTipoIds: string[]`.
- `esModificador`: derivar como `requisitoTipoIds.length > 0`.

```typescript
// En validate() - incluir en select:
requisitosComoModificador: { select: { id: true } }

// Luego:
const requisitoTipoIds = usuario.requisitosComoModificador?.map(r => r.id) ?? [];
return {
  ...
  esModificador: requisitoTipoIds.length > 0,
  requisitoTipoIds,
};
```

#### `auth.service.ts`

- Login, getProfile, validateRefreshToken: incluir `requisitoTipoIds: string[]` y `esModificador = requisitoTipoIds.length > 0`.
- Consultar `requisitosComoModificador` al cargar usuario.

#### `requisitos.service.ts`

- **Eliminar:** `validarUsuarioPuedeSerModificador`, `syncUsuarioComoModificador`, `syncUsuarioRetirarModificador`.
- **crearRequisitoTipo:** asignar `modificadorId` directamente en `RequisitoTipo.create`. No actualizar Usuario.
- **actualizarRequisitoTipo:** al cambiar `modificadorId`, solo actualizar `RequisitoTipo`. No sincronizar Usuario.
- **eliminarRequisitoTipo:** eliminar el requisito. No llamar a `syncUsuarioRetirarModificador` (ya no existe).

#### `auth.controller.ts` / respuesta login

- Asegurar que la respuesta incluya `requisitoTipoIds` y `esModificador` derivados.

---

### 2.4 Frontend – cambios por archivo

#### `auth.service.ts` (core)

- `AuthUser`: cambiar `requisitoTipoId?: string | null` → `requisitoTipoIds?: string[]`.
- `puedeVerUsuarios()`: `esModificador` sigue siendo booleano; no requiere cambios si el backend lo envía.

#### Componentes que usan `requisitoTipoId`

- `usuario-detail.component.ts`: `esModificadorViendoOtro()` usa `esModificador`, no `requisitoTipoId` → sin cambios.
- El estado-general ya devuelve `puedeModificarEstado` por requisito desde el API → sin cambios.

---

## 3. Resumen de archivos a modificar

| Archivo | Acción |
|---------|--------|
| `prisma/schema.prisma` | Eliminar `esModificador`, `requisitoTipoId`, relación `UsuarioComoModificador` |
| `prisma/migrations/` | Nueva migración |
| `jwt.strategy.ts` | Cargar `requisitoTipoIds`, `esModificador` derivado |
| `auth.service.ts` (backend) | Incluir `requisitoTipoIds` en login/profile/refresh |
| `requisitos.service.ts` | Eliminar validación y sync; solo usar `RequisitoTipo.modificadorId` |
| `auth.service.ts` (frontend) | `AuthUser.requisitoTipoIds` opcional |

---

## 4. Compatibilidad

- **Usuarios existentes:** No hay datos en `Usuario.requisitoTipoId` que migrar; la relación real está en `RequisitoTipo.modificadorId`.
- **JWT:** Los clientes antiguos con `requisitoTipoId` en sesión dejarán de tenerlo; el frontend debe tolerar ambos durante transición (opcional).

---

## 5. Documentación actualizada

- `flujoRequisitosAdicionales.md`: actualizado con la nueva regla de múltiples requisitos por modificador.
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
StrReplace