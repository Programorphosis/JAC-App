# Política de eliminación de usuarios – JAC App

**Versión:** 1.0  
**Fecha:** 2025-02-18  
**Referencia:** CHECKLIST_OPERACION_JUNTAS.md §2.1

---

## 1. Principio

Los usuarios de una junta tienen historial asociado: pagos, cartas, documentos, historial laboral, requisitos. **No se eliminan usuarios** para preservar trazabilidad y auditoría.

    ---ºººº

## 2. Política adoptada: desactivación (soft)

| Acción | Operación | Cuándo |
|--------|-----------|--------|
| **Desactivar** | `Usuario.activo = false` | Usuario ya no pertenece a la junta, se retira, o por decisión administrativa |
| **Eliminar (hard)** | DELETE Usuario | ❌ No implementado. No se usa. |

---

## 3. Comportamiento de usuario inactivo

Cuando `activo = false`:

- **No puede** solicitar carta.
- **No puede** registrar pago (ni propio ni por tesorera).
- **No puede** iniciar sesión (AuthService valida `usuario.activo`).
- **La deuda** se mantiene para auditoría (no se borra).
- **Los listados** pueden filtrar por activo (Todos / Activos / Inactivos).

---

## 4. Implementación

- **Schema:** `Usuario.activo Boolean @default(true)`. Opcional: `fechaBaja DateTime?` para registrar cuándo se desactivó.
- **Backend:** `UsuarioInactivoError` en cartas, pagos, LetterEmissionRunner. Validación antes de operaciones sensibles.
- **Frontend:** Filtro en listado de usuarios. Mensaje explícito si se intenta operar con usuario inactivo.

---

## 5. Casos no cubiertos

- **Usuario creado por error:** Desactivar inmediatamente. No eliminar.
- **Datos duplicados (mismo documento):** El schema impide crear dos usuarios con mismo documento en la junta (`@@unique([juntaId, numeroDocumento])`).
- **Migración o cumplimiento:** El export de junta (Platform Admin) incluye usuarios; no se eliminan para conservar historial.

---

**Referencias:** plan.md §10, CHECKLIST_OPERACION_JUNTAS.md, VALIDACION_CHECKLIST_OPERACION.md
