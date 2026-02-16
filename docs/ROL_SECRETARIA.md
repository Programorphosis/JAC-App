# Rol SECRETARIA – Validación y datos básicos

**Versión:** 1.0  
**Referencia:** plan.md, ROL_ADMIN.md

---

## 1. Propósito

SECRETARIA es un rol **operativo limitado**: valida cartas y edita datos básicos de usuarios. No gestiona pagos ni modifica tarifas, requisitos, historial laboral o documentos. Solo **visualiza** la información.

---

## 2. SECRETARIA puede

| Área | Acciones |
|------|----------|
| **Cartas** | Validar/aprobar cartas pendientes |
| **Usuarios** | Crear usuarios, editar datos básicos (nombres, apellidos, teléfono, dirección, activo) |
| **Pago propio online** | En Mi cuenta: pagar su deuda junta y su carta **solo online** (Wompi). No registra efectivo. |
| **Visualización** | Ver usuarios, deuda, historial de pagos, historial de cartas, requisitos, documentos, tarifas, auditorías |

---

## 3. SECRETARIA no puede

| Área | Motivo |
|------|--------|
| Registrar pagos (efectivo/transferencia) | Exclusivo TESORERA – unificación contable |
| Crear intención de pago para otros | Exclusivo TESORERA |
| Crear/editar tarifas | Exclusivo ADMIN |
| Cambiar estado requisitos (AL_DÍA/MORA) | Solo modificador asignado al requisito |
| Cambiar obligación requisitos | Exclusivo ADMIN |
| Agregar historial laboral | ADMIN, TESORERA |
| Subir documentos | ADMIN, TESORERA, CIUDADANO (propios) |
| Editar roles de usuarios | Exclusivo ADMIN |

---

## 4. Unicidad

Solo puede haber **una** SECRETARIA por junta (validación en backend).

---

## 5. Implementación

- Backend: SECRETARIA retirada de endpoints de pagos, tarifas crear, documentos subir, historial crear, requisitos estado/obligación.
- Backend: SECRETARIA agregada a auditorías (solo lectura).
- Frontend: `puedeGestionarPagos()` = solo TESORERA. SECRETARIA no ve menú Pagos.
- Frontend: `puedeModificarTarifas()` = solo ADMIN. SECRETARIA ve tarifas pero sin botón crear.
- Frontend: Botón "Pagar online" en deuda/cartas: TESORERA para cualquiera; CIUDADANO o SECRETARIA solo para su propia cuenta.
