# Rol ADMIN – Configuración y mantenimiento

**Versión:** 1.0  
**Referencia:** plan.md, 00_ARQUITECTURA_RECTOR copy.md

---

## 1. Propósito

ADMIN es un rol de **configuración y mantenimiento** de la junta. No realiza tareas operativas (pagos, cartas, requisitos). Su función es mantener parámetros, usuarios y configuraciones.

---

## 2. ADMIN puede

| Área | Acciones |
|------|----------|
| **Usuarios** | Crear, editar, eliminar usuarios de la junta |
| **Requisitos** | Crear, editar, eliminar tipos de requisito (RequisitoTipo) |
| **Tarifas** | Crear, listar tarifas |
| **Auditoría** | Ver auditorías (cuando exista el módulo) |
| **Historiales** | Ver historial laboral, documentos (solo lectura) |
| **Credenciales** | Configurar credenciales pasarela de pago (cuando exista) |

---

## 3. ADMIN no puede

| Área | Motivo |
|------|--------|
| Solicitar carta | Operacional |
| Pagar deuda online | Operacional |
| Pagar carta online | Operacional |
| Registrar pagos (efectivo/transferencia) | Operacional – TESORERA, SECRETARIA |
| Validar/aprobar cartas | Operacional – SECRETARIA |
| Cambiar estado requisitos (AL_DÍA/MORA) | Operacional – solo modificador asignado |
| Cambiar obligación requisitos | Operacional – SECRETARIA |
| Agregar historial laboral | Operacional – SECRETARIA |
| Subir documentos | Operacional – SECRETARIA, TESORERA, CIUDADANO |

---

## 4. Alcance

Todo lo que ADMIN puede hacer está limitado a **su junta** (juntaId del usuario). No puede acceder a datos de otras juntas.

---

## 5. Roles operativos

Las tareas que ADMIN no realiza las ejecutan:

- **SECRETARIA:** validar cartas, editar datos básicos de usuarios (solo visualización del resto)
- **TESORERA:** registrar pagos, crear historial laboral
- **ADMIN:** cambiar obligación requisitos
- **Modificador:** cambiar estado requisitos (AL_DÍA/MORA) de sus requisitos asignados
- **CIUDADANO:** solicitar carta, pagar deuda/carta online

---

## 6. Implementación

- Backend: ADMIN no está en `@Roles` de endpoints operativos (pagos, cartas, requisitos estado/obligacion, historial crear, documentos subir).
- Frontend: `puedeVerPagos()` y `puedeVerCartasPendientes()` excluyen ADMIN.
- ADMIN puede ver usuarios (listar, detalle) y estado general para gestión de usuarios.
