# Resultados: Investigación y Plan de Documentación Legal – JAC App

**Fecha:** 2026-02-25  
**Estado:** Investigación completada; documentación pendiente de redacción e implementación.

---

## Resumen ejecutivo

Se realizó una investigación de la legislación colombiana aplicable al SaaS JAC App (gestión digital de Juntas de Acción Comunal). Este documento consolida los resultados y el plan para cubrir por completo la documentación legal.

---

## Normativa identificada

| Norma | Vigencia | Aplicación a JAC App |
|-------|----------|----------------------|
| **Ley 2166 de 2021** | Vigente | Juntas de Acción Comunal; reemplaza Ley 743. |
| **Ley 1581 de 2012** | Vigente | Protección de datos personales; obligatoria. |
| **Decreto 1377 de 2013** | Vigente | Reglamenta Ley 1581. |
| **Ley 1266 de 2008** | Vigente | Habeas Data financiero; evaluar si aplica a pagos. |
| **Ley 527 de 1999** | Vigente | Comercio electrónico, firma digital, validez de aceptaciones. |
| **Resoluciones DIAN** | Vigente | Facturación electrónica; evaluar obligación. |
| **Decreto 090 de 2018** | Vigente | RNBD; criterios de obligación. |

---

## Documentos que deben crearse

| # | Documento | Prioridad | Ubicación |
|---|-----------|-----------|-----------|
| 1 | Términos de servicio | Alta | `/terminos` |
| 2 | Política de privacidad | Alta | `/privacidad` |
| 3 | Política de cancelación | Alta | `/legal/cancelacion` o en Términos |
| 4 | Política de retención | Alta | Interno + mención en privacidad |
| 5 | Política de Tratamiento de Datos (interno) | Alta | Interno |
| 6 | Política de cookies | Media | Si se usan cookies |
| 7 | Autorización de tratamiento (textos) | Alta | En formularios |

---

## Implementación técnica requerida

| Elemento | Estado | Acción |
|----------|--------|--------|
| Rutas `/terminos`, `/privacidad` | Pendiente | Crear páginas públicas |
| Enlaces en footer | Pendiente | Añadir en layout |
| Checkbox "Acepto términos" | Pendiente | En creación de junta/registro |
| Checkbox "Acepto privacidad" | Pendiente | En formularios de datos personales |
| Guardar fecha de aceptación | Pendiente | Tabla o campo en Junta |
| Flujo cancelación con mensaje | Pendiente | Coherente con política |

---

## Evaluaciones pendientes (con asesores)

| Evaluación | Responsable sugerido | Documento de referencia |
|------------|----------------------|-------------------------|
| Obligación facturación electrónica | Contador / tributario | INVESTIGACION §4 |
| Obligación RNBD (activos > 100.000 UVT) | Legal / contador | INVESTIGACION §2.4 |
| Revisión final documentos | Abogado | INDEX.md |

---

## Archivos generados

| Archivo | Contenido |
|---------|-----------|
| `INVESTIGACION_LEGISLACION_COLOMBIANA_JAC_SAAS.md` | Investigación normativa completa e indexada. |
| `INVENTARIO_DOCUMENTACION_LEGAL_OBLIGATORIA.md` | Listado de requisitos por documento. |
| `INDEX.md` | Índice para revisión profesional. |
| `RESULTADOS_INVESTIGACION_LEGAL.md` | Este archivo; resumen de resultados. |

---

## Cómo usar esta documentación

1. **Revisión profesional:** Un abogado o asesor legal debe revisar `INDEX.md` y los dos documentos principales.
2. **Redacción:** Usar `INVENTARIO_DOCUMENTACION_LEGAL_OBLIGATORIA.md` como guía para redactar cada documento.
3. **Implementación:** Seguir el checklist de implementación técnica del inventario.
4. **Validación:** Cruzar con `CHECKLIST_SAAS_PROFESIONAL.md` §6 (Legal y comercial).

---

## Referencias cruzadas en el proyecto

- `docs/CHECKLIST_SAAS_PROFESIONAL.md` — §6.1 Términos, §6.2 Privacidad, §6.3 Cancelación, §7.4 Retención
- `docs/plan.md` — Contexto legal del sistema
- `docs/politicasInmutabilidad.md` — Coherencia con retención de datos
