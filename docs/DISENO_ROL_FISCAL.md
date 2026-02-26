# Diseño – Rol FISCAL

**Versión:** 1.0  
**Fecha:** 2025-02-18  
**Estado:** Aprobado para implementación

---

## 1. Propósito del rol

El **FISCAL** ejerce control y vigilancia sobre la gestión administrativa y financiera de la junta. Sus funciones típicas:

- Vigilar la gestión administrativa y financiera.
- Revisar cuentas.
- Verificar que se cumplan estatutos y decisiones.
- Presentar informes a la asamblea.

**Principio:** Solo lectura, pero una lectura avanzada que permita ejercer control.

---

## 2. Permisos del FISCAL

### 2.1 Resumen

| Recurso | Acción | FISCAL |
|---------|--------|--------|
| Pagos | Ver listado, filtros, estadísticas | ✓ |
| Pagos | Registrar (efectivo, transferencia, online) | ✗ |
| Auditorías | Ver historial de acciones | ✓ |
| Auditorías | Modificar | ✗ |
| Reportes | Ver reportes de la junta | ✓ |
| Reportes | Exportar (si existe) | ✓ |
| Usuarios | Ver listado y detalle | ✓ |
| Usuarios | Crear, editar, desactivar | ✗ |
| Cartas | Ver (solo lectura) | ✓ |
| Cartas | Solicitar, validar, rechazar | ✗ |
| Requisitos | Ver | ✓ |
| Requisitos | Modificar | ✗ |
| Tarifas | Ver | ✓ |
| Tarifas | Crear, editar | ✗ |
| Historial laboral | Ver | ✓ |
| Historial laboral | Crear, cerrar | ✗ |
| Documentos | Ver | ✓ |
| Documentos | Subir | ✗ |
| Configuración junta | Ver | ✗ |
| Configuración junta | Modificar (Wompi, etc.) | ✗ |

### 2.2 Permisos técnicos (nombres)

Permisos de solo lectura que el FISCAL tendrá:

| Permiso | Descripción |
|---------|-------------|
| PAGOS_VER | Ver listado de pagos, dashboard contable, estadísticas |
| AUDITORIAS_VER | Ver historial de auditoría |
| USUARIOS_VER | Ver listado y detalle de usuarios |
| CARTAS_VER* | Ver cartas (pendiente definir si CARTAS_VER existe o se deriva) |
| REQUISITOS_VER | Ver requisitos |
| TARIFAS_VER | Ver tarifas |
| DOCUMENTOS_VER | Ver documentos (si existe) |

*Nota:* Revisar si hay permiso explícito para "ver cartas de otros" o si se usa CARTAS_VALIDAR con restricción. El FISCAL no valida; solo ve. Se puede crear `CARTAS_VER` para lectura sin validar.

### 2.3 Menú y navegación

El FISCAL verá en el menú lateral:

- **Dashboard** (accesos directos según permisos)
- **Pagos** (solo ver dashboard contable y listado, sin tab "Registrar")
- **Auditorías**
- **Reportes** (si existe módulo)
- **Usuarios** (solo ver)
- **Cartas** (solo ver, sin Validar/Rechazar) — o integrado en otra vista
- **Requisitos** (solo ver)
- **Tarifas** (solo ver)
- **Documentos** (solo ver, si aplica)

No verá:

- Configuración (Wompi, etc.)
- Plan y suscripción (o solo lectura si se define)
- Botones de crear/editar/registrar en cualquier módulo

---

## 3. Asignación del rol

- Se asigna igual que los otros roles directivos (ADMIN, SECRETARIA, TESORERA).
- El ADMIN de la junta puede asignar el rol FISCAL a un usuario desde el detalle de usuario.
- No requiere proceso especial ni migración de datos.

---

## 4. Cambios técnicos

### 4.1 Backend

| Archivo / Componente | Cambio |
|----------------------|--------|
| `prisma/schema.prisma` | Añadir `FISCAL` al enum `RolNombre` |
| Migración | Crear migración para el nuevo valor en el enum |
| `permissions-from-roles.ts` | Mapear FISCAL → permisos de solo lectura (PAGOS_VER, AUDITORIAS_VER, USUARIOS_VER, etc.) |
| `permissions.constants.ts` | Verificar que existan los permisos necesarios |
| Guards / RolesGuard | Añadir RolNombre.FISCAL donde corresponda (endpoints de lectura) |

### 4.2 Frontend

| Archivo / Componente | Cambio |
|----------------------|--------|
| `permissions.constants.ts` | Alinear con backend |
| `app.routes.ts` | Los guards de permisos ya filtran por permiso; si FISCAL tiene PAGOS_VER, verá la ruta |
| `layout.component` | Menú: mostrar ítems según permisos. FISCAL verá Pagos, Auditorías, etc. |
| Componentes de Pagos | Ocultar o deshabilitar tab "Registrar" si el usuario tiene solo PAGOS_VER y no PAGOS_GESTIONAR |
| Usuario-detail tabs | FISCAL verá tabs Deuda, Historial, Requisitos, Cartas, Documentos (solo lectura) |

### 4.3 Matriz de permisos

Actualizar `MATRIZ_PERMISOS_ROLES.md` con la columna FISCAL y los permisos definidos.

---

## 5. Criterios de cierre

- [ ] FISCAL existe como rol en el sistema.
- [ ] FISCAL puede ver pagos, auditorías, usuarios, cartas, requisitos, tarifas, documentos (solo lectura).
- [ ] FISCAL no puede registrar pagos, validar cartas, editar usuarios, ni modificar configuración.
- [ ] El menú muestra las opciones adecuadas para FISCAL.
- [ ] ADMIN puede asignar rol FISCAL a usuarios.
- [ ] Documentación actualizada en MATRIZ_PERMISOS_ROLES.md.

---

## 6. Referencias

- `PLAN_IMPLEMENTACION_OPERACION.md` Fase 5
- `CHECKLIST_OPERACION_JUNTAS.md` §12
- `MATRIZ_PERMISOS_ROLES.md`
