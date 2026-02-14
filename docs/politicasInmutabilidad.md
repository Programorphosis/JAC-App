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
- **HistorialLaboral:** Nunca UPDATE ni DELETE. Carga inicial y altas posteriores; sin edición de registros históricos.
- **HistorialRequisito:** Nunca UPDATE ni DELETE. Cada cambio de estado/obligación genera nuevo registro.
- **Auditoria:** Nunca UPDATE ni DELETE. Es el registro de hechos; inmutable por diseño.
- **Tarifa:** Versionado por `fechaVigencia`. No se editan tarifas pasadas; se crean nuevas.
- **Carta:** Una vez APROBADA o RECHAZADA, no se modifica. Solo PENDIENTE puede cambiar de estado.

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
