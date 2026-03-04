# Índice: Documentación Legal – JAC App SaaS

**Propósito:** Punto de entrada para la revisión profesional de la documentación legal. Permite verificar que no quede nada sin cubrir.

---

## Estructura de la carpeta `docs/legal/`

```
docs/legal/
├── INDEX.md                                    ← Este archivo (índice para revisión)
├── RESULTADOS_INVESTIGACION_LEGAL.md           ← Resumen ejecutivo y próximos pasos
├── INVESTIGACION_LEGISLACION_COLOMBIANA_JAC_SAAS.md   ← Investigación normativa
└── INVENTARIO_DOCUMENTACION_LEGAL_OBLIGATORIA.md      ← Qué debe documentarse
```

---

## Guía de revisión para profesionales

### Paso 1: Validar la investigación normativa

**Archivo:** `INVESTIGACION_LEGISLACION_COLOMBIANA_JAC_SAAS.md`

| Sección | Verificar |
|---------|-----------|
| Ley 2166 de 2021 | ¿Es la norma vigente para JAC? ¿Falta reglamentación? |
| Ley 1581, D. 1377 | ¿Cubre todos los aspectos de protección de datos? |
| Ley 1266 | ¿Aplica a datos financieros de afiliados/juntas? |
| Ley 527 | ¿Cubre aceptación electrónica, pagos online? |
| Facturación DIAN | ¿Obligación actualizada para 2025? |
| RNBD | ¿Criterios de obligación correctos? |
| Retención | ¿Plazos coherentes con tributaria y auditoría? |

**Acción:** Marcar si falta normativa relevante o si hay errores.

---

### Paso 2: Validar el inventario de documentación

**Archivo:** `INVENTARIO_DOCUMENTACION_LEGAL_OBLIGATORIA.md`

| Documento | ¿Obligatorio? | ¿Completo el listado de requisitos? |
|-----------|----------------|-------------------------------------|
| Términos de servicio | Sí | Revisar §1.1 |
| Política de privacidad | Sí (Ley 1581) | Revisar §1.2 |
| Política de cancelación | Sí (contratos) | Revisar §1.3 |
| Política de retención | Sí (Ley 1581, tributaria) | Revisar §1.4 |
| Política de cookies | Si se usan | Revisar §1.5 |
| Política de Tratamiento (interno) | Sí (Ley 1581) | Revisar §2.1 |
| Autorización de tratamiento | Sí (Ley 1581) | Revisar §2.2 |
| RNBD | Si aplica | Revisar §2.3 |

**Acción:** Añadir requisitos faltantes o corregir los existentes.

---

### Paso 3: Verificar cobertura del SaaS

**Preguntas para el revisor:**

1. **Datos que procesa la app:** ¿La política de privacidad debe mencionar algo más? (ej. datos de Wompi, logs de auditoría, IP, user-agent).
2. **Terceros:** ¿Están todos los subprocesadores listados? (AWS, Wompi, Mailgun, etc.)
3. **Transferencias internacionales:** ¿AWS/Mailgun implican transferencias? ¿Qué salvaguardas?
4. **Rol de la junta:** ¿La junta es Responsable y la plataforma Encargada respecto a datos de afiliados?
5. **Facturación:** ¿La plataforma está obligada a facturación electrónica?
6. **RNBD:** ¿La empresa que opera JAC App supera 100.000 UVT en activos?

---

### Paso 4: Integración con el resto del proyecto

| Documento del proyecto | Relación con legal |
|------------------------|--------------------|
| `CHECKLIST_SAAS_PROFESIONAL.md` §6 | Términos, privacidad, cancelación |
| `CHECKLIST_SAAS_PROFESIONAL.md` §7.4 | Retención de datos |
| `plan.md` | Contexto legal del sistema |
| `politicasInmutabilidad.md` | Coherencia con retención |
| `archive/POLITICA_ELIMINACION_USUARIOS.md` | Coherencia con privacidad y derechos |

---

## Checklist de revisión profesional

- [ ] Investigación normativa revisada y completada.
- [ ] Inventario de documentación validado.
- [ ] No hay lagunas legales identificadas.
- [ ] Requisitos específicos de JAC (Ley 2166) considerados.
- [ ] Requisitos de datos personales (Ley 1581) completos.
- [ ] Obligaciones SaaS y contratos cubiertas.
- [ ] Facturación y tributaria evaluadas.
- [ ] Flujos de aceptación y evidencia definidos.

---

## Próximos pasos tras la revisión

1. Redactar los documentos según el inventario.
2. Implementar rutas, checkboxes y evidencia en la app.
3. Publicar documentos en `/terminos`, `/privacidad`, etc.
4. Evaluar RNBD y facturación electrónica con asesores.
5. Revisión final con abogado antes de lanzamiento comercial.
