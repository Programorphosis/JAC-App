# Políticas de Inmutabilidad – Sistema JAC

**Versión:** 1.0  
**Referencia:** plan.md §10, investigacionImplementacionDeSeguridadDeLaApp.md, 00_ARQUITECTURA_RECTOR copy.md

---

## 1. Principio

Todo dato con impacto legal debe ser **inmutable o trazable**. Si se puede cambiar sin rastro, el sistema no es auditable.

---

## 2. Tablas que NO deben actualizarse ni borrarse

| Tabla | Operaciones permitidas | Corrección si hay error |
|-------|------------------------|-------------------------|
| **Pago** | Solo INSERT | Nuevo registro de ajuste/corrección documentado |
| **HistorialLaboral** | Solo INSERT | Nuevo registro (alta de corrección) |
| **HistorialRequisito** | Solo INSERT | No se corrige; el historial es ley |
| **Auditoria** | Solo INSERT | No se modifica nunca |
| **Tarifa** | INSERT (versionado por fecha) | Nueva tarifa con nueva fechaVigencia |
| **Carta** | INSERT; UPDATE solo para PENDIENTE → APROBADA/RECHAZADA | No se editan cartas emitidas |

---

## 3. Reglas técnicas

- **Pago:** Nunca UPDATE ni DELETE. Si se registró mal, se hace un nuevo pago de ajuste con metadata explícita.
- **HistorialLaboral:** Nunca UPDATE ni DELETE. Carga inicial y altas posteriores; sin edición de registros históricos. **Fecha de inicio:** Si se crea con `fechaInicio` en el pasado, la validación de superposición (HistorialLaboralSuperpuestoError) evita solapamientos. Si `fechaInicio` es futura, está permitido (programar cambio de estado). El cálculo de deuda usa solo registros cuyo intervalo cubra el mes; los futuros no afectan hasta que llegue la fecha.
- **HistorialRequisito:** Nunca UPDATE ni DELETE. Cada cambio de estado/obligación genera nuevo registro.
- **Auditoria:** Nunca UPDATE ni DELETE. Es el registro de hechos; inmutable por diseño.
- **Tarifa:** Versionado por `fechaVigencia`. No se editan tarifas pasadas; se crean nuevas. **No se eliminan tarifas:** el cálculo de deuda las necesita para meses históricos. Ver §3.1.
- **Carta:** Una vez APROBADA o RECHAZADA, no se modifica. Solo PENDIENTE puede cambiar de estado.

---

## 3.1 Política de tarifas (detalle)

| Operación | Permitida | Cómo |
|-----------|-----------|------|
| Crear tarifa | ✅ | POST /tarifas con estadoLaboral, valorMensual, fechaVigencia |
| "Editar" tarifa | ✅ | Crear **nueva** tarifa con fechaVigencia = hoy; la anterior deja de ser vigente para meses futuros |
| Eliminar tarifa | ❌ | No. El cálculo de deuda usa tarifas históricas por mes |
| Modificar tarifa existente | ❌ | No. Solo INSERT de nuevas versiones |

**Referencia:** CHECKLIST_OPERACION_JUNTAS.md §3.2, calculadoraDeDeuda.md §8

---

## 4. Implementación en PostgreSQL (futuro)

Para reforzar a nivel de base de datos:

```sql
REVOKE UPDATE, DELETE ON "Pago" FROM app_user;
REVOKE UPDATE, DELETE ON "HistorialLaboral" FROM app_user;
REVOKE UPDATE, DELETE ON "HistorialRequisito" FROM app_user;
REVOKE UPDATE, DELETE ON "Auditoria" FROM app_user;
```

En la etapa actual, la inmutabilidad se garantiza por convención y revisión de código. La aplicación no ejecuta UPDATE/DELETE en estas tablas salvo en los casos documentados (ej. Carta PENDIENTE → APROBADA).

---

## 5. Excepciones documentadas

| Entidad | Excepción | Justificación |
|---------|-----------|---------------|
| Carta | UPDATE estado PENDIENTE → APROBADA/RECHAZADA | Flujo normal de emisión; se registra en Auditoria |
| Usuario | UPDATE datos de contacto, activo | No es dato financiero; se audita |
| RequisitoTipo | UPDATE nombre, modificador, activo | Configuración; se audita |
| EstadoRequisito | UPDATE estado, obligacionActiva | Único punto de modificación; RequisitoService + HistorialRequisito |

---

**Referencias:** plan.md, investigacionImplementacionDeSeguridadDeLaApp.md, definicionDomainServices.md
