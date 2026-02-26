# Contenido del export de junta – JAC App

**Versión:** 1.0  
**Fecha:** 2025-02-18  
**Referencia:** `apps/backend/src/platform/operaciones/platform-operaciones.service.ts`

---

## 1. Propósito

El Platform Admin puede exportar datos de una junta (JSON o CSV) para soporte, migración, cumplimiento o backup. Endpoint: `GET /platform/juntas/:id/exportar?format=json|csv`.

---

## 2. Contenido del export

### 2.1 Estructura JSON

```json
{
  "exportadoEn": "2025-02-18T...",
  "junta": {
    "id", "nombre", "nit", "telefono", "email", "direccion",
    "ciudad", "departamento", "activo", "enMantenimiento", "fechaCreacion",
    "suscripcion": { "plan", "estado", "fechaVencimiento" }
  },
  "resumen": {
    "totalUsuarios", "totalTarifas", "totalPagos", "totalCartas",
    "totalRequisitosTipo", "totalFacturas", "totalNotas"
  },
  "usuarios": [...],
  "tarifas": [...],
  "pagos": [...],
  "cartas": [...],
  "requisitosTipo": [...],
  "facturas": [...],
  "notas": [...]
}
```

### 2.2 Detalle por sección

| Sección | Campos | Límite | Nota |
|---------|--------|--------|------|
| **usuarios** | id, tipoDocumento, numeroDocumento, nombres, apellidos, telefono, activo, fechaCreacion | Todos | Sin roles ni passwordHash |
| **tarifas** | Todos los campos | Todas | Ordenadas por fechaVigencia DESC |
| **pagos** | Todos + usuario (nombres, apellidos, numeroDocumento) | 1000 más recientes | Ordenados por fechaPago DESC |
| **cartas** | Todos + usuario (nombres, apellidos, numeroDocumento) | 500 más recientes | Ordenados por fechaSolicitud DESC |
| **requisitosTipo** | Todos + _count.estados | Todos | |
| **facturas** | Todos + pagos relacionados | Todas | Ordenadas por fechaEmision DESC |
| **notas** | Todos + creadoPor (nombres, apellidos) | Todas | Ordenadas por fechaCreacion DESC |

---

## 3. Lo que NO incluye

- **Archivos S3:** Los documentos (PDF, imágenes) y cartas (PDF) están en S3. El export solo incluye metadatos (id, tipo, usuarioId, etc.), no los archivos binarios.
- **Credenciales Wompi:** No se exportan.
- **PasswordHash:** No se incluye en usuarios.
- **Otras juntas:** Solo datos de la junta solicitada. Multi-tenant respetado.

---

## 4. Formato CSV

El CSV incluye:

- Cabecera: Junta (nombre, nit, activo), Resumen (totalUsuarios, totalPagos, totalCartas)
- Sección Usuarios: numeroDocumento, nombres, apellidos, activo, fechaCreacion

El CSV es una versión reducida del JSON para lectura rápida. Para datos completos, usar JSON.

---

## 5. Uso recomendado

- **Cumplimiento:** Conservar export periódico según política de retención.
- **Migración:** Export JSON como backup antes de cambios estructurales.
- **Soporte:** Revisar datos sin acceso directo a BD.
- **Auditoría:** Complementar con tabla Auditoria (no incluida en este export).

---

**Referencias:** PLAN_ADMINISTRADOR_PLATAFORMA.md, platform-operaciones.service.ts
