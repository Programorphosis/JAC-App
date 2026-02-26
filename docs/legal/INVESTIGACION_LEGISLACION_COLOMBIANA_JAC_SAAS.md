# Investigación: Legislación Colombiana Aplicable al SaaS JAC App

**Versión:** 1.0  
**Fecha:** 2026-02-25  
**Objetivo:** Compilar la normativa colombiana que rige las Juntas de Acción Comunal, el software/SaaS, la protección de datos y la operación del sistema. Base para documentación legal completa y revisión profesional.

---

## Índice de la investigación

1. [Normativa Juntas de Acción Comunal](#1-normativa-juntas-de-acción-comunal)
2. [Protección de datos personales (Habeas Data)](#2-protección-de-datos-personales-habeas-data)
3. [Comercio electrónico y firma digital](#3-comercio-electrónico-y-firma-digital)
4. [Facturación electrónica y tributaria](#4-facturación-electrónica-y-tributaria)
5. [Contratos y obligaciones SaaS](#5-contratos-y-obligaciones-saas)
6. [Seguridad digital y ciberseguridad](#6-seguridad-digital-y-ciberseguridad)
7. [Retención de datos y documentación](#7-retención-de-datos-y-documentación)
8. [Referencias y fuentes oficiales](#8-referencias-y-fuentes-oficiales)

---

## 1. Normativa Juntas de Acción Comunal

### 1.1 Ley 2166 de 2021 (VIGENTE)

**Deroga la Ley 743 de 2002.** Es la norma principal que rige las Juntas de Acción Comunal en Colombia.

| Aspecto | Detalle |
|---------|---------|
| **Objeto** | Desarrollar el artículo 38 de la Constitución Política sobre organismos de acción comunal. Establecer lineamientos para la política pública. |
| **Alcance** | ~65.000 Juntas de Acción Comunal en el territorio nacional. |
| **Principios** | Organización democrática, moderna, participativa y representativa. Relaciones con el Estado. |
| **Relevancia para JAC App** | El software gestiona datos de afiliados, pagos, cartas y requisitos de JAC. Debe respetar la naturaleza jurídica (personería jurídica, patrimonio propio, sin ánimo de lucro) y los procesos que la ley exige a las JAC. |

**Cambios principales respecto a Ley 743:**
- Participación en planes de desarrollo municipales/departamentales.
- Modernización administrativa y estructuras estatutarias.
- Convenios solidarios para contratación.
- Acceso a subsidios y apoyo organizacional.

**Fuente:** [Ley 2166 de 2021](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=184758), [Unidad Solidaria](https://www.unidadsolidaria.gov.co/prensa/noticias-ley-comunales-2166-de-2021)

---

### 1.2 Ley 743 de 2002 (DEROGADA)

Derogada por Ley 2166 de 2021. Se mantiene como referencia histórica.

- Reglamentada por **Decreto 2350 de 2003**.
- Definía: JAC como organizaciones cívicas, sociales, sin ánimo de lucro, naturaleza solidaria.
- Requisitos de afiliación, derechos, deberes, impedimentos, desafiliación.

---

### 1.3 Decretos y reglamentación

- **Decreto 2350 de 2003:** Reglamentaba la Ley 743 (ahora sustituida por la normativa de la Ley 2166).
- Consultar decretos reglamentarios vigentes de la Ley 2166 en [Alcaldía de Bogotá - SISJUR](https://www.alcaldiabogota.gov.co/sisjur/).

---

## 2. Protección de datos personales (Habeas Data)

### 2.1 Ley Estatutaria 1581 de 2012

**Norma principal de protección de datos personales en Colombia.**

| Aspecto | Detalle |
|---------|---------|
| **Objeto** | Desarrollar el derecho constitucional (arts. 15 y 20 CP) a conocer, actualizar y rectificar informaciones en bases de datos. |
| **Vigencia** | Desde 27 de junio de 2013 (Decreto 1377). |
| **Alcance** | Datos personales en bases de datos de entidades públicas o privadas en territorio colombiano (y según tratados internacionales). |
| **Exclusiones** | Bases personales/domésticas, seguridad nacional, inteligencia, contenido periodístico, datos regulados por Ley 1266 (financieros). |

**Obligaciones para el Responsable del Tratamiento:**
- Autorización previa, expresa e informada del titular.
- Política de Tratamiento de Datos Personales.
- Garantizar derechos: conocer, actualizar, rectificar, suprimir.
- Registro Nacional de Bases de Datos (RNBD) cuando aplique.

**Fuente:** [Ley 1581 de 2012](https://normograma.crcom.gov.co/crc/compilacion/docs/ley_1581_2012.htm)

---

### 2.2 Decreto 1377 de 2013

Reglamenta parcialmente la Ley 1581.

| Área | Contenido |
|------|-----------|
| Autorización del titular | Requisitos para autorizar tratamiento. |
| Políticas de tratamiento | Normas para Responsables y Encargados. |
| Derechos de titulares | Ejercicio de derechos sobre datos. |
| Transferencias | Regulación de transferencias de datos. |
| Responsabilidad | Obligaciones de demostrar cumplimiento (Accountability). |

**Fuente:** [Decreto 1377 de 2013](https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=53646)

---

### 2.3 Ley 1266 de 2008 (Habeas Data financiero)

Regula datos financieros, crediticios, comerciales y de servicios.

- Complementa la Ley 1581 para datos de naturaleza financiera.
- **Relevancia para JAC App:** Pagos, facturación, historial de pagos de afiliados pueden tener tratamiento especial. Las juntas manejan cuotas y obligaciones; la plataforma procesa datos de pagos. Evaluar si hay datos que caigan bajo Ley 1266.

**Fuente:** [Ley 1266 de 2008](https://observatoriolegislativocele.com/en/colombia-habeas-law-data-and-financial-information-2008/)

---

### 2.4 Registro Nacional de Bases de Datos (RNBD)

| Aspecto | Detalle |
|---------|---------|
| **Administrador** | Superintendencia de Industria y Comercio (SIC). |
| **Obligados** | Según Decreto 090 de 2018: sociedades y entidades sin ánimo de lucro con activos > 100.000 UVT (~COP$5.000 millones en 2025); personas jurídicas públicas. |
| **No obligados** | Empresas menores; pero **todas** las que manejan datos personales deben cumplir Ley 1581. |
| **Plazos** | Actualización anual: 2 feb – 31 mar. Nuevas bases: 2 meses desde creación. Cambios sustanciales: 10 días hábiles del mes siguiente. |
| **Sanciones** | Multas hasta 2.000 SMMLV, suspensión hasta 6 meses, cierre temporal o definitivo. |

**Fuente:** [RNBD SIC](https://rnbd.sic.gov.co/), [SIC Preguntas Frecuentes RNBD](https://www.sic.gov.co/preguntas-frecuentes-rnbd)

---

### 2.5 Circular 2 de 2024 (SIC) – Inteligencia Artificial

Lineamientos sobre tratamiento de datos en sistemas de IA. Relevante si en el futuro se usan modelos de IA que procesen datos personales.

---

## 3. Comercio electrónico y firma digital

### 3.1 Ley 527 de 1999

| Aspecto | Detalle |
|---------|---------|
| **Objeto** | Mensajes de datos, comercio electrónico, firmas digitales, entidades de certificación. |
| **Firma electrónica** | Equivalente a firma manuscrita; misma validez y efectos jurídicos. |
| **Requisitos firma digital** | Única a la persona, verificable, bajo control exclusivo, ligada al mensaje (cualquier cambio la invalida), conforme a reglamentación. |
| **Métodos** | Códigos, contraseñas, datos biométricos, claves criptográficas privadas. |

**Relevancia para JAC App:**
- Contratos SaaS aceptados electrónicamente (checkbox, clic).
- Pagos online (Wompi) como mensajes de datos.
- Cartas emitidas con QR/validación digital.
- Términos y condiciones aceptados por medios electrónicos.

**Fuente:** [Ley 527 de 1999](https://and.gov.co/node/63)

---

## 4. Facturación electrónica y tributaria

### 4.1 Obligatoriedad DIAN

- **Resolución 000165 de 2023** (modificada por Resolución 8 de 2024).
- Calendario según tipo de contribuyente (grandes contribuyentes, declarantes de renta, no declarantes).
- **2025:** Nuevo servicio DIAN para facturación con solo NIT o cédula; proveedores deben actualizar sistemas.

**Relevancia para JAC App:**
- La plataforma factura a las juntas (suscripciones). Debe evaluar si está obligada a facturación electrónica.
- Las juntas como clientes pueden requerir factura electrónica.
- Integración con proveedores: Siigo, Alegra, Zoho u otros.

**Fuente:** [DIAN Facturación Electrónica](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/), [Resolución 8 de 2024](https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0008_2024.htm)

---

### 4.2 Retención tributaria y contable

- **Estatuto Tributario:** Obligaciones de conservar soportes de operaciones.
- **Práctica:** Retención de facturas y documentos contables **5 años** (consultar con contador para precisar).
- **Relevancia:** Política de retención de datos debe alinearse con obligaciones tributarias.

---

## 5. Contratos y obligaciones SaaS

### 5.1 Tipos de contrato

| Tipo | Descripción |
|------|-------------|
| **B2C (adhesión)** | Términos no negociables; el consumidor acepta o rechaza. |
| **B2B (negociable)** | Juntas como clientes; pueden negociar condiciones. |

**JAC App:** Las juntas son clientes B2B (organizaciones). Los afiliados son usuarios finales bajo responsabilidad de la junta.

---

### 5.2 Obligaciones del proveedor SaaS (referencia doctrinal)

1. Proporcionar accesos necesarios para el servicio.
2. Garantizar seguridad de la información del cliente.
3. Conservar registros contables, soportes y archivos en formato digital.
4. Responder oportunamente a observaciones sobre funcionamiento.
5. Facturar conforme a requisitos legales.
6. **Devolver bases de datos del cliente** en formatos estándar (txt, html, etc.) al finalizar el contrato.

**Fuente:** [Contrato SaaS Colombia](https://phylo.co/blog/contrato-de-computacion-en-la-nube-en-la-modalidad-saas/)

---

### 5.3 Consideraciones tributarias – Computación en la nube

- **Oficio 17123 DIAN:** Servicios SaaS pueden calificar como computación en la nube y tener tratamiento IVA específico.
- Requiere: características de cloud computing, modelo SaaS, modelo de implementación (nube pública, privada, etc.).

---

## 6. Seguridad digital y ciberseguridad

### 6.1 Resolución 500 de 2021 (MinTIC)

- Lineamientos para estrategia de seguridad digital.
- Modelo de seguridad y privacidad como habilitador de Gobierno Digital.
- Referencia para buenas prácticas en sistemas que manejan datos sensibles.

---

### 6.2 Ley 2126 de 2021

**No aplica a ciberseguridad.** Regula comisarías de familia. Incluida para evitar confusión.

---

## 7. Retención de datos y documentación

### 7.1 Ley 1581

- No fija plazos numéricos obligatorios explícitos.
- Principio: conservar datos solo el tiempo necesario para la finalidad.
- Al finalizar: supresión segura o anonimización.

### 7.2 Obligaciones tributarias

- **Facturas y soportes:** 5 años (confirmar con asesor tributario).
- **Datos de auditoría:** Recomendación 5–10 años para defensa legal/contable (ver `investigacionImplementacionDeSeguridadDeLaApp.md`).

### 7.3 Política de retención recomendada

| Tipo de dato | Retención sugerida | Base legal/referencia |
|--------------|--------------------|------------------------|
| Pagos, facturas | 5 años | Obligaciones tributarias |
| Cartas emitidas | 5 años | Auditoría legal |
| Historial laboral | 5 años | Auditoría legal |
| Auditoría (logs) | 5–10 años | Defensa ante auditorías |
| Datos de usuarios | Hasta fin de relación + periodo legal | Ley 1581, contrato |
| Backups | Según política (ej. 90 días S3) | Operacional |

---

## 8. Referencias y fuentes oficiales

| Entidad | URL | Uso |
|---------|-----|-----|
| Alcaldía Bogotá – SISJUR | https://www.alcaldiabogota.gov.co/sisjur/ | Normas nacionales |
| DIAN | https://www.dian.gov.co/ | Facturación, tributaria |
| SIC | https://www.sic.gov.co/ | Protección datos, RNBD |
| RNBD | https://rnbd.sic.gov.co/ | Registro bases de datos |
| Función Pública – Gestor Normativo | https://www.funcionpublica.gov.co/eva/gestornormativo/ | Normas vigentes |
| Agencia Nacional Digital | https://and.gov.co/ | Ley 527, firma digital |
| Unidad Solidaria | https://www.unidadsolidaria.gov.co/ | Juntas de Acción Comunal |

---

## Resumen ejecutivo para JAC App

| Área | Norma principal | Acción requerida |
|------|-----------------|------------------|
| JAC | Ley 2166 de 2021 | Respetar naturaleza jurídica de las JAC en términos y operación. |
| Datos personales | Ley 1581, D. 1377 | Política de privacidad, autorización, derechos de titulares, evaluar RNBD. |
| Comercio electrónico | Ley 527 | Validez de aceptación electrónica de términos y contratos. |
| Facturación | Resoluciones DIAN | Evaluar obligación facturación electrónica; integrar si aplica. |
| Contratos SaaS | Doctrina, B2B | Términos de servicio, política de cancelación, devolución de datos. |
| Retención | Ley 1581, tributaria | Política documentada; 5 años mínimo para datos críticos. |

---

**Próximo paso:** Ver `INVENTARIO_DOCUMENTACION_LEGAL_OBLIGATORIA.md` para el listado de documentos que deben redactarse e implementarse.
