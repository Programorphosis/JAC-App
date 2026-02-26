# Inventario: Documentación Legal Obligatoria – JAC App SaaS

**Versión:** 1.0  
**Fecha:** 2026-02-25  
**Objetivo:** Listar todo lo que debe estar documentado y publicado para cubrir por completo la operación legal del SaaS, según legislación colombiana y buenas prácticas.

**Base:** `INVESTIGACION_LEGISLACION_COLOMBIANA_JAC_SAAS.md`

---

## Índice del inventario

1. [Documentos públicos (sitio web / app)](#1-documentos-públicos-sitio-web--app)
2. [Documentos internos y políticas](#2-documentos-internos-y-políticas)
3. [Flujos y aceptaciones en la app](#3-flujos-y-aceptaciones-en-la-app)
4. [Cumplimiento por área legal](#4-cumplimiento-por-área-legal)
5. [Checklist de implementación](#5-checklist-de-implementación)

---

## 1. Documentos públicos (sitio web / app)

### 1.1 Términos de servicio (o Condiciones de uso)

| Requisito | Descripción | Ley/Referencia |
|-----------|-------------|----------------|
| Alcance del servicio | Qué ofrece la plataforma (gestión de JAC: afiliados, pagos, cartas, requisitos). | Ley 527, contratos B2B |
| Partes | Identificación del proveedor (empresa) y del cliente (junta). | Contratos |
| Obligaciones del proveedor | Disponibilidad, soporte, seguridad, facturación. | Obligaciones SaaS |
| Obligaciones del cliente | Uso correcto, pago, cumplir políticas. | Contratos |
| Uso aceptable | Prohibiciones (uso ilícito, abuso, fraude). | Ley 527, buenas prácticas |
| Limitación de responsabilidad | Exclusiones y límites según ley aplicable. | Código de Comercio |
| Propiedad intelectual | Software, marcas, contenidos. | Propiedad intelectual |
| Modificaciones | Cómo se notifican cambios (email, aviso en app, fecha efectiva). | Ley 527 |
| Ley aplicable y jurisdicción | Colombia; tribunales competentes. | Contratos |
| Duración y terminación | Suscripción, cancelación, efectos al terminar. | Contratos SaaS |
| Devolución de datos | Formato y plazo para entregar datos al cliente al finalizar. | Obligaciones SaaS |

**Ubicación:** `/terminos` o `/legal/terminos` — accesible sin login.  
**Fecha de actualización:** Visible en el documento.

---

### 1.2 Política de privacidad (y Tratamiento de datos personales)

| Requisito | Descripción | Ley/Referencia |
|-----------|-------------|----------------|
| Responsable del tratamiento | Nombre, contacto, NIT. | Ley 1581, D. 1377 |
| Datos que se recogen | Nombres, documento, email, teléfono, dirección, datos de pago, documentos subidos, etc. | Ley 1581 |
| Finalidad del tratamiento | Gestión de afiliados, pagos, cartas, facturación, soporte. | Ley 1581 |
| Base legal | Consentimiento, ejecución de contrato, interés legítimo. | Ley 1581 |
| Compartir con terceros | Wompi, AWS S3, Mailgun, proveedores de facturación. | Ley 1581 |
| Transferencias internacionales | Si aplica (AWS, Mailgun); salvaguardas. | Ley 1581, D. 1377 |
| Retención | Plazos por tipo de dato; referencia a política de retención. | Ley 1581 |
| Derechos del titular | Conocer, actualizar, rectificar, suprimir, revocar autorización. | Ley 1581 |
| Canal para ejercer derechos | Email, formulario, proceso documentado. | Ley 1581 |
| Cambios en la política | Cómo se notifican; fecha de última actualización. | Ley 1581 |
| Cookies y tecnologías | Si se usan; finalidad; cómo gestionarlas. | Buenas prácticas |

**Ubicación:** `/privacidad` o `/legal/privacidad` — accesible sin login.  
**Enlaces:** Footer, formularios de registro, pantalla de login.

---

### 1.3 Política de cancelación y reembolsos

| Requisito | Descripción | Ley/Referencia |
|-----------|-------------|----------------|
| Cancelación | Inmediata o al fin del ciclo; cómo solicitarla. | Términos, flujo técnico |
| Reembolso | Regla general (ej. no reembolso por periodo consumido). | Términos |
| Excepciones | Si hay garantía de satisfacción u otras. | Términos |
| Acceso tras cancelación | Hasta cuándo; exportación de datos; borrado. | Ley 1581, obligaciones SaaS |
| Comunicación | Mensaje claro al cancelar; enlace en precios/planes. | UX, términos |

**Ubicación:** `/legal/cancelacion` o sección en Términos.  
**Coherencia:** Debe coincidir con el flujo técnico de cancelación.

---

### 1.4 Política de retención de datos

| Requisito | Descripción | Ley/Referencia |
|-----------|-------------|----------------|
| Datos operativos | Pagos, cartas, usuarios: X años (ej. 5). | Tributaria, auditoría |
| Facturación | Según obligaciones tributarias (ej. 5 años). | DIAN, Estatuto Tributario |
| Auditoría (logs) | X años (ej. 5–10). | Auditoría legal |
| Backups | Según política de backups (§2.2). | Operacional |
| Post-retención | Anonimización o borrado seguro. | Ley 1581 |
| Mención en privacidad | Incluir en política de privacidad. | Ley 1581 |

**Ubicación:** Documento interno + resumen en Política de privacidad.

---

### 1.5 Política de cookies (si aplica)

| Requisito | Descripción |
|-----------|-------------|
| Cookies usadas | Técnicas, analíticas, preferencias. |
| Finalidad | Sesión, seguridad, analytics. |
| Base legal | Consentimiento o interés legítimo. |
| Gestión | Cómo aceptar, rechazar o configurar. |

**Ubicación:** Sección en Política de privacidad o página dedicada.

---

## 2. Documentos internos y políticas

### 2.1 Política de Tratamiento de Datos Personales (interno)

Documento interno que desarrolla la Política de privacidad. Requerido por Ley 1581 para Responsables y Encargados.

| Contenido | Descripción |
|-----------|-------------|
| Criterios de recolección | Cuándo y cómo se recogen datos. |
| Almacenamiento | Medidas de seguridad, ubicación. |
| Uso y circulación | Quién accede; transferencias. |
| Supresión | Proceso y plazos. |
| Procedimientos | Para ejercer derechos, para reportar incidentes. |

**Uso:** Auditorías, cumplimiento; no necesariamente público completo.

---

### 2.2 Autorización de tratamiento de datos

| Requisito | Descripción | Ley/Referencia |
|-----------|-------------|----------------|
| Previo | Antes de recolectar. | Ley 1581, D. 1377 |
| Expreso | Checkbox o acción explícita. | Ley 1581 |
| Informado | Conocer finalidad, responsables, derechos. | Ley 1581, D. 1377 |
| Revocable | Cómo revocar; efectos. | Ley 1581 |

**Implementación:** Checkbox en registro de usuario, creación de junta, formularios que recojan datos personales.

---

### 2.3 Registro de Bases de Datos (RNBD)

| Aspecto | Acción |
|---------|--------|
| Evaluar obligación | Si activos > 100.000 UVT o persona jurídica pública. |
| Si aplica | Registrar en RNBD; actualizar según plazos (anual, nuevas bases, cambios). |
| Documentar | Criterio de decisión (obligado o no) y fechas de registro/actualización. |

---

## 3. Flujos y aceptaciones en la app

### 3.1 Aceptación de Términos de servicio

| Requisito | Implementación |
|-----------|----------------|
| Momento | Al crear junta o al registrarse (según flujo). |
| Checkbox | "Acepto los términos de servicio" con enlace. |
| Obligatorio | No permitir continuar sin aceptar. |
| Evidencia | Guardar fecha y versión/hash de aceptación (Junta o tabla separada). |

---

### 3.2 Aceptación de Política de privacidad

| Requisito | Implementación |
|-----------|----------------|
| Momento | Al crear usuario, al crear junta, en formularios de datos personales. |
| Checkbox | "Acepto la política de privacidad" con enlace. |
| Evidencia | Fecha de aceptación (opcional pero recomendado). |

---

### 3.3 Autorización de tratamiento de datos

| Requisito | Implementación |
|-----------|----------------|
| Momento | Al crear usuario, al subir documentos, al registrar datos sensibles. |
| Texto | "Autorizo el tratamiento de mis datos personales conforme a la política de privacidad." |
| Enlace | A política de privacidad. |

---

### 3.4 Flujo de cancelación

| Requisito | Implementación |
|-----------|----------------|
| Mensaje claro | "No hay reembolso por el periodo actual. Tendrás acceso hasta [fecha]." |
| Confirmación | Confirmar antes de cancelar. |
| Exportación | Ofrecer exportación de datos antes del borrado (si aplica). |

---

## 4. Cumplimiento por área legal

### 4.1 Ley 2166 (Juntas de Acción Comunal)

| Ítem | Documentación |
|------|---------------|
| Naturaleza de las JAC | Términos deben reconocer que el cliente es una JAC (personería jurídica, sin ánimo de lucro). |
| Datos de afiliados | Política de privacidad debe explicar que la junta es responsable de los datos de sus afiliados; la plataforma actúa como Encargada. |

---

### 4.2 Ley 1581 (Datos personales)

| Ítem | Documentación |
|------|---------------|
| Política de privacidad | Completa, accesible, actualizada. |
| Autorización | Previo, expreso, informado en todos los puntos de recolección. |
| Derechos | Canal para ejercer; proceso documentado. |
| Retención | Política documentada; coherente con ley. |
| RNBD | Evaluar y registrar si aplica. |

---

### 4.3 Ley 527 (Comercio electrónico)

| Ítem | Documentación |
|------|---------------|
| Validez de aceptación | Términos aceptados electrónicamente (checkbox, clic) tienen validez. |
| Trazabilidad | Fecha y versión de aceptación guardadas. |

---

### 4.4 Facturación y tributaria

| Ítem | Documentación |
|------|---------------|
| Obligación facturación electrónica | Evaluar con contador; documentar decisión. |
| Retención | 5 años para facturas y soportes (confirmar con asesor). |

---

### 4.5 Contratos SaaS

| Ítem | Documentación |
|------|---------------|
| Términos de servicio | Publicados, coherentes con operación. |
| Política de cancelación | Clara, visible en precios/planes. |
| Devolución de datos | Formato y plazo definidos en términos. |

---

## 5. Checklist de implementación

### Documentos a redactar

- [x] **Términos de servicio** — Redacción completa según §1.1. (implementado en `/terminos`)
- [x] **Política de privacidad** — Redacción completa según §1.2. (implementado en `/privacidad`)
- [x] **Política de cancelación** — Redacción según §1.3. (implementado en `/legal/cancelacion`)
- [ ] **Política de retención** — Redacción según §1.4. (resumen en privacidad; documento interno pendiente)
- [ ] **Política de Tratamiento de Datos (interno)** — Documento interno según §2.1.

### Implementación técnica

- [x] **Rutas públicas** — `/terminos`, `/privacidad`, `/legal/cancelacion`.
- [x] **Footer** — Enlaces en login y en layout (Términos, Privacidad, Cancelación).
- [x] **Checkbox de términos** — En creación de junta (junta-form).
- [x] **Checkbox de privacidad/autorización** — En creación de junta y en usuario-form.
- [x] **Evidencia de aceptación** — `terminosAceptadosEn` y `terminosVersion` en Junta.
- [x] **Flujo de cancelación** — Mensaje coherente con política; enlace a política en plan-suscripcion.

### Cumplimiento

- [ ] **Evaluación RNBD** — Determinar si hay obligación de registro.
- [ ] **Evaluación facturación electrónica** — Con asesor tributario.
- [ ] **Revisión legal** — Asesoría profesional antes de lanzamiento comercial.

### Referencias cruzadas

| Documento | Referencia en proyecto |
|-----------|------------------------|
| `CHECKLIST_SAAS_PROFESIONAL.md` | §6.1, §6.2, §6.3, §7.4 |
| `plan.md` | Contexto legal |
| `INVESTIGACION_LEGISLACION_COLOMBIANA_JAC_SAAS.md` | Base normativa |

---

**Próximo paso:** Redactar cada documento según este inventario; integrar en la app; revisar con asesoría legal profesional.
