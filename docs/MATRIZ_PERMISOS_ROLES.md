# Matriz de permisos por rol – JAC App

**Fuente de verdad** para qué puede hacer cada rol. Backend y frontend deben alinearse a esta matriz.

---

## 1. Resumen por rol

| Rol | Propósito principal |
|-----|---------------------|
| **ADMIN** | Configuración: usuarios, requisitos, tarifas. No operativo. |
| **SECRETARIA** | Cartas (validar), datos básicos usuarios, pago propio online. |
| **TESORERA** | Pagos (efectivo, transferencia, online para otros), historial laboral, documentos. |
| **RECEPTOR_AGUA** | Modificador: cambiar estado (AL_DÍA/MORA) de sus requisitos asignados. |
| **CIUDADANO** | Autogestión: pagar online propio, solicitar carta, subir documentos propios. |

---

## 2. Detalle usuario – Tabs visibles

Cuando un usuario ve el detalle de otro usuario (GET /usuarios/:id), qué tabs ve:

| Tab | ADMIN (otro) | SECRETARIA (otro) | TESORERA (otro) | Modificador (otro) | CIUDADANO (otro) |
|-----|--------------|-------------------|-----------------|--------------------|--------------------|
| Deuda | ✓ | ✓ | ✓ | ✗ | ✗ |
| Historial laboral | ✓ | ✓ | ✓ | ✗ | ✗ |
| Requisitos | ✓ | ✓ | ✓ (solo ver) | ✓ (solo sus asignados) | ✗ |
| **Cartas** | ✗ | ✓ | **✗** | ✗ | ✗ |
| Documentos | ✓ | ✓ | ✓ | ✗ | ✗ |

**Regla:** TESORERA no ve tab Cartas cuando mira a otro usuario. Solo SECRETARIA puede ver/gestionar cartas de otros.

---

## 3. Acciones por recurso

### 3.1 Requisitos – Estado (AL_DÍA / MORA)

| Rol | Propio | Otros |
|-----|--------|-------|
| ADMIN | ✗ | ✗ |
| SECRETARIA | ✗ | ✗ |
| TESORERA | ✗ | **✗** |
| RECEPTOR_AGUA (modificador) | ✓ (solo requisitos asignados) | ✓ (solo requisitos asignados) |
| CIUDADANO | ✗ | ✗ |

**Regla:** Solo el **modificador asignado** al RequisitoTipo puede cambiar estado. TESORERA no modifica requisitos.

### 3.2 Requisitos – Obligación (activar/exentar)

| Rol | Propio | Otros |
|-----|--------|-------|
| ADMIN | ✓ | ✓ |
| Resto | ✗ | ✗ |

### 3.3 Pagos – Efectivo / Transferencia

| Rol | Registrar para otros |
|-----|----------------------|
| TESORERA | ✓ |
| Resto | ✗ |

### 3.4 Pagos – Online (intención Wompi)

| Rol | Deuda junta (otros) | Carta (otros) |
|-----|--------------------|--------------|
| TESORERA | ✓ | ✓ |
| SECRETARIA | ✗ | ✗ |
| CIUDADANO | ✗ | ✗ |

**Propio:** SECRETARIA y CIUDADANO pueden pagar online su deuda y su carta.

**Nota:** TESORERA puede crear link Wompi para que otro usuario pague. Pero si TESORERA no ve el tab Cartas de otros, no verá el botón "Pagar carta online" en ese contexto. El botón "Pagar deuda online" sí aparece en tab Deuda.

### 3.5 Cartas

| Acción | SECRETARIA | TESORERA | CIUDADANO |
|--------|------------|----------|-----------|
| Listar cartas de otro | ✓ | ✗ | ✗ |
| Solicitar carta para otro | ✓ | ✗ | ✗ |
| Validar carta | ✓ | ✗ | ✗ |
| Solicitar carta propia | ✗ | ✗ | ✓ |
| Descargar PDF (propio) | ✓ | ✓ | ✓ |

### 3.6 Documentos

| Rol | Subir para otros |
|-----|------------------|
| ADMIN | ✓ |
| TESORERA | ✓ |
| Resto | ✗ (solo propio) |

### 3.7 Historial laboral

| Rol | Crear para otros |
|-----|------------------|
| ADMIN | ✓ |
| TESORERA | ✓ |
| Resto | ✗ |

---

## 4. Implementación

### Backend

- `PermissionService.puedeVerCartasDeOtro`: solo SECRETARIA ✓
- `estado-general.service`: `puedeModificarEstado` = solo modificador (quitar TESORERA)
- `requisitos-usuario.controller`: quitar TESORERA y CIUDADANO de actualizarEstado
- `UsuarioPropioOAdminGuard`: TESORERA puede ver detalle usuario ✓

### Frontend

- `usuario-detail`: TESORERA viendo otro → tabs sin Cartas (como ADMIN viendo otro)
- `canPagarOnlinePara`: TESORERA para cualquiera ✓ (pero el tab Cartas no se muestra para otros)
- Requisitos: `puedeModificarEstado` viene del backend; al quitar TESORERA, no verá botones

---

## 5. Referencias

- `ROL_ADMIN.md`, `ROL_SECRETARIA.md`, `ROL_TESORERA_FRONTEND.md`, `ROL_CIUDADANO_FRONTEND.md`
- `permisos.md` – Sistema de permisos explícitos
- `flujoRequisitosAdicionales.md` – Modificadores
