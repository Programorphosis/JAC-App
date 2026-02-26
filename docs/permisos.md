# Sistema de Permisos – JAC App

El sistema usa **permisos explícitos** en el JWT. El backend es la fuente de verdad; el frontend solo verifica `can(permiso)`.

## Flujo

1. **Login/Refresh**: El backend calcula `permissions: string[]` desde los roles del usuario.
2. **JWT/User**: El objeto `user` incluye `permissions` (ej. `['usuarios:ver', 'pagos:gestionar']`).
3. **Frontend**: `AuthService.can(permiso)` comprueba si el permiso está en la lista.
4. **Templates**: Se usa la directiva `*appCan` o `auth.can()` para mostrar/ocultar contenido.

## Añadir un permiso nuevo

### 1. Backend

**`apps/backend/src/auth/permissions.constants.ts`**
```typescript
export const PERMISSIONS = {
  // ...
  NUEVO_MODULO_ACCION: 'nuevoModulo:accion',
} as const;
```

**`apps/backend/src/auth/permissions-from-roles.ts`**
```typescript
if (roles.includes(RolNombre.ADMIN)) {
  set.add(PERMISSIONS.NUEVO_MODULO_ACCION);
}
```

### 2. Frontend

**`apps/frontend/src/app/core/auth/permissions.constants.ts`**

Añadir la misma constante (debe coincidir con el backend).

### 3. Uso en templates

**Directiva estructural (recomendado):**
```html
<button *appCan="auth.permissions.NUEVO_MODULO_ACCION" (click)="accion()">Acción</button>
```

**Con contexto (usuarioId):**
```html
<button *appCan="auth.permissions.PAGOS_PAGAR_ONLINE; usuarioId: usuarioId">Pagar</button>
```

**En TypeScript:**
```typescript
if (this.auth.can(this.auth.permissions.NUEVO_MODULO_ACCION)) {
  // ...
}
```

### 4. Guards de ruta

**`permission.guard.ts`**
```typescript
export const nuevoModuloGuard = requirePermission(PERMISSIONS.NUEVO_MODULO_ACCION);
```

## Permisos con contexto

Algunos permisos dependen de si la acción es sobre el propio usuario u otro:

| Permiso | Con usuarioId | Lógica |
|---------|---------------|--------|
| `pagos:pagarOnline` | Sí | TESORERA: cualquiera; AFILIADO/SECRETARIA: solo propio |
| `documentos:subir:otros` | Sí | Propio siempre; otros si ADMIN/TESORERA |
| `cartas:solicitar` | Sí | Solo propio y con permiso |

Usar `*appCan="auth.permissions.X; usuarioId: usuarioId"` para estos casos.

## Permisos actuales

| Permiso | Roles |
|---------|-------|
| `usuarios:ver` | ADMIN, SECRETARIA, TESORERA, modificador |
| `usuarios:crear` | ADMIN, SECRETARIA |
| `usuarios:editar` | ADMIN, SECRETARIA |
| `usuarios:editarRoles` | ADMIN |
| `requisitos:ver` | ADMIN |
| `requisitos:modificar` | ADMIN |
| `pagos:gestionar` | TESORERA |
| `pagos:ver` | TESORERA, ADMIN, SECRETARIA |
| `pagos:pagarOnline` | TESORERA (para cualquiera) |
| `pagos:pagarOnline:propio` | AFILIADO, SECRETARIA |
| `tarifas:ver` | ADMIN, SECRETARIA, TESORERA |
| `tarifas:modificar` | TESORERA |
| `cartas:validar` | SECRETARIA |
| `cartas:solicitar` | AFILIADO (solo propio) |
| `auditorias:ver` | ADMIN, SECRETARIA, TESORERA |
| `documentos:subir:otros` | ADMIN, TESORERA |
| `historial:crear` | ADMIN, TESORERA |

## Referencias

- `apps/backend/src/auth/permissions.constants.ts`
- `apps/backend/src/auth/permissions-from-roles.ts`
- `apps/frontend/src/app/core/auth/auth.service.ts`
- `apps/frontend/src/app/core/auth/app-can.directive.ts`
