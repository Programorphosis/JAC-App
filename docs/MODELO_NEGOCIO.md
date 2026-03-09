# Modelo de Negocio – JAC App

**Versión:** 1.0  
**Fecha:** 2026-03-09  
**Objetivo:** Documento base para el modelo de negocio del SaaS JAC App. Sirve como marco para investigación posterior que refine precios, proyecciones y estrategia de go-to-market.

**Contexto:** Alineado con la crítica constructiva del proyecto (producto + plan de negocio). Complementa `plan.md`, `FLUJOS_SUSCRIPCIONES_PLANES.md`, `MODELO_OVERRIDES_CONSUMO.md` y `CHECKLIST_SAAS_PROFESIONAL.md`.

---

## Índice

1. [Propuesta de valor](#1-propuesta-de-valor)
2. [Segmento objetivo](#2-segmento-objetivo)
3. [Modelo de ingresos](#3-modelo-de-ingresos)
4. [Precios actuales y rangos para investigación](#4-precios-actuales-y-rangos-para-investigación)
5. [Proyección de ingresos (plantilla)](#5-proyección-de-ingresos-plantilla)
6. [Costos operativos (plantilla)](#6-costos-operativos-plantilla)
7. [Estrategia de adquisición (plantilla)](#7-estrategia-de-adquisición-plantilla)
8. [Análisis competitivo](#8-análisis-competitivo)
9. [Áreas de investigación pendiente](#9-áreas-de-investigación-pendiente)
10. [Referencias cruzadas](#10-referencias-cruzadas)

---

## 1. Propuesta de valor

### 1.1 Problema que resuelve

Las Juntas de Acción Comunal en Colombia operan procesos críticos de forma manual:

| Problema | Impacto |
|----------|---------|
| Cobro de cuotas manual | Filas, tiempos muertos, riesgo de errores |
| Validación de requisitos en papel | Falta de trazabilidad |
| Expedición de cartas laborales manual | Dependencia de personas clave |
| Control de obligaciones disperso | Difícil auditoría histórica |

### 1.2 Solución JAC App

Sistema digital que:

- **Digitaliza** cobros, requisitos, cartas y obligaciones sin eliminar la operación presencial.
- **Mantiene historial legal completo** (inmutabilidad, auditoría, consecutivos).
- **Permite pagos presenciales y online** (solo pagos totales; no parciales).
- **Genera cartas solo si se cumplen TODOS los requisitos** (deuda junta = 0, requisitos al día, pago carta).
- **Es defendible ante auditoría** (registro contable digital, trazabilidad).

### 1.3 Propuesta de valor (elevator pitch)

> "JAC App es el registro contable digital para Juntas de Acción Comunal. Reduce errores, elimina filas y te da trazabilidad legal en cobros, requisitos y cartas laborales. Todo auditable, sin pagos parciales."

### 1.4 Diferenciadores vs alternativas

| Alternativa | Limitación | Ventaja JAC App |
|-------------|------------|-----------------|
| Excel / hojas de cálculo | Sin trazabilidad, sin auditoría, errores humanos | Historial inmutable, consecutivos, auditoría |
| Papel / libros físicos | Pérdida, deterioro, difícil consulta | Digital, búsqueda, respaldo |
| Soluciones genéricas de cobro | No adaptadas a JAC, sin requisitos ni cartas | Específico para JAC, flujos legales |
| Desarrollo a medida | Costo alto, mantenimiento complejo | SaaS listo, actualizaciones incluidas |

---
 
## 2. Segmento objetivo

### 2.1 Mercado total

- **~65.000 Juntas de Acción Comunal** en Colombia (Ley 2166 de 2021).
- Organizaciones cívicas, sociales, **sin ánimo de lucro**, naturaleza solidaria.
- Personería jurídica, patrimonio propio.
- Operan con cuotas de afiliados, requisitos adicionales (agua, basura) y expedición de cartas laborales.

### 2.2 Segmentación propuesta (para investigación)

| Segmento | Descripción | Tamaño estimado | Prioridad |
|----------|-------------|-----------------|-----------|
| **Pequeñas** | < 50 afiliados, operación simple | Alto volumen | Entrada, plan Básico |
| **Medianas** | 50–200 afiliados, más trámites | Volumen medio | Plan Premium, overrides |
| **Grandes** | > 200 afiliados, alta demanda de cartas | Bajo volumen | Plan personalizado |
| **Urbanas** | Mayor conectividad, adopción digital | Variable | Canal digital |
| **Rurales** | Menor conectividad, operación híbrida | Variable | Modelo presencial + digital |

### 2.3 Perfil de decisor

- **Presidente de junta** o **Tesorería** (aprobación de gasto).
- **Secretaría** (uso diario).
- Sensibilidad al costo (presupuesto limitado).
- Necesidad de cumplimiento legal y auditoría.

---

## 3. Modelo de ingresos

### 3.1 Fuentes de ingreso

| Fuente | Descripción | Frecuencia |
|--------|-------------|------------|
| **Suscripción por plan** | Pago mensual o anual según plan (Básico, Premium, etc.) | Mensual o anual |
| **Overrides** | Exceso de consumo (usuarios, storage, cartas) en planes personalizables | Mensual, automático |
| **Planes personalizados** | Acuerdos comerciales especiales (grandes juntas) | Según contrato |

### 3.2 Lo que NO cobra la plataforma

- **Pagos de afiliados a la junta** (cuota junta, pago carta): van directo a la cuenta de la junta vía Wompi por junta. La plataforma no retiene comisión.
- **Pagos de la junta a la plataforma** (suscripción): van a la cuenta del proveedor del SaaS.

### 3.3 Flujos de pago (resumen)

| Flujo | Documento de referencia |
|-------|-------------------------|
| Crear suscripción (con/sin trial) | `FLUJOS_SUSCRIPCIONES_PLANES.md` §1, §2 |
| Upgrade, downgrade | `FLUJOS_SUSCRIPCIONES_PLANES.md` §4, §5 |
| Overrides automáticos | `MODELO_OVERRIDES_CONSUMO.md` |
| Renovación | `FLUJOS_SUSCRIPCIONES_PLANES.md` §8 |
| Cancelación | `CHECKLIST_SAAS_PROFESIONAL.md` §3.3 |

---

## 4. Precios actuales y rangos para investigación

### 4.1 Planes en seed (estado actual)

| Plan | precioMensual | precioAnual | Usuarios | Storage | Cartas/mes | Trial |
|------|---------------|-------------|----------|---------|------------|-------|
| **Básico** | 0 COP | 0 COP | 50 | 100 MB | 20 | 30 días |
| **Premium** | 50.000 COP | 500.000 COP | 200 | 500 MB | 100 | 14 días |

**Nota:** Básico a 0 COP es una decisión comercial (freemium, adopción). Debe validarse en investigación.

### 4.2 Precios por demanda (overrides)

En schema: `precioPorUsuarioAdicional`, `precioPorMbAdicional`, `precioPorCartaAdicional` (COP por unidad).

| Campo | Estado actual | Rango sugerido para investigación |
|-------|---------------|-----------------------------------|
| precioPorUsuarioAdicional | No definido en seed | 2.000 – 5.000 COP/usuario/mes |
| precioPorMbAdicional | No definido en seed | 50 – 200 COP/MB/mes |
| precioPorCartaAdicional | No definido en seed | 500 – 2.000 COP/carta/mes |

### 4.3 Descuento anual (para investigación)

- **Premium actual:** 500.000 / 12 ≈ 41.667 COP/mes (≈17% descuento vs 50.000 mensual).
- **Rango a evaluar:** 10% – 20% descuento por pago anual.

### 4.4 Preguntas para investigación de precios

1. ¿Cuánto paga hoy una junta por gestión manual (tiempo, errores, papel)?
2. ¿Cuál es la disposición a pagar (WTP) por digitalización?
3. ¿El plan Básico gratuito genera conversión a Premium o solo adopción sin ingreso?
4. ¿Qué precios tienen competidores directos o indirectos?
5. ¿Qué elasticidad tiene la demanda respecto al precio?

---

## 5. Proyección de ingresos (plantilla)

### 5.1 Variables de entrada

| Variable | Valor actual (placeholder) | Fuente |
|----------|----------------------------|--------|
| Juntas totales Colombia | ~65.000 | Ley 2166, Unidad Solidaria |
| Penetración año 1 | 0,1% | A definir en investigación |
| Penetración año 3 | 1% | A definir en investigación |
| Mix planes (Básico / Premium) | 70% / 30% | A definir |
| ARPU mensual (solo planes pagos) | 50.000 COP | Promedio ponderado |
| Tasa de churn mensual | 3% – 5% | Benchmark SaaS SMB |

### 5.2 Fórmulas base

```
MRR = Juntas activas × % en plan pago × ARPU
ARR = MRR × 12
```

### 5.3 Escenarios ilustrativos (sin validar)

| Escenario | Juntas año 1 | MRR (COP) | ARR (COP) |
|-----------|--------------|-----------|-----------|
| Conservador | 65 (0,1%) | 975.000 | 11.700.000 |
| Moderado | 200 | 3.000.000 | 36.000.000 |
| Optimista | 500 | 7.500.000 | 90.000.000 |

**Nota:** Estos números son placeholders. La investigación debe validar penetración realista, mix de planes y ARPU.

---

## 6. Costos operativos (plantilla)

### 6.1 Costos fijos mensuales (estimado)

| Concepto | Rango (COP/mes) | Notas |
|----------|-----------------|-------|
| Hosting (VPS, DB) | 100.000 – 300.000 | Lightsail, DigitalOcean |
| S3, email (Mailgun) | 50.000 – 150.000 | Según volumen |
| Dominio, SSL | 10.000 – 30.000 | |
| Wompi (comisión facturación) | % sobre cobros | ~2,9% + 400 COP por transacción |
| **Subtotal infra** | **160.000 – 480.000** | |

### 6.2 Costos variables

| Concepto | Fórmula |
|----------|---------|
| Wompi suscripciones | % sobre cada pago de junta a plataforma |
| S3 storage | Por GB almacenado |
| Email transaccional | Por envío (Mailgun) |

### 6.3 Costos de adquisición (CAC)

| Canal | CAC estimado (COP) | Notas |
|-------|--------------------|-------|
| Orgánico / boca a boca | 0 – 50.000 | Tiempo, contenido |
| Federaciones / alianzas | 100.000 – 300.000 | Eventos, capacitación |
| Digital (ads) | 50.000 – 200.000 | Por junta convertida |
| Ventas directas | 200.000 – 500.000 | Tiempo comercial |

**Pregunta para investigación:** ¿Cuál es el CAC real por canal y el LTV por junta?

---

## 7. Estrategia de adquisición (plantilla)

### 7.1 Canales a explorar

| Canal | Descripción | Prioridad |
|-------|-------------|-----------|
| **Federaciones de JAC** | Agrupaciones regionales o municipales | Alta |
| **Alcaldías / Secretarías de gobierno** | Convenios, subsidios, pilotos | Alta |
| **Unidad Solidaria** | Entidad que acompaña a JAC (Ley 2166) | Media |
| **Boca a boca** | Juntas que recomiendan a otras | Media |
| **Contenido / SEO** | Guías, normativa, buenas prácticas | Media |
| **Eventos presenciales** | Ferias, capacitaciones | Baja inicial |

### 7.2 Funnel propuesto (para validar)

```
Conocimiento → Interés → Trial/Demo → Conversión → Retención
```

### 7.3 Acciones concretas pendientes

- [ ] Definir canal principal (ej. federaciones vs alcaldías).
- [ ] Diseñar oferta de piloto (2–3 juntas, acompañamiento).
- [ ] Crear landing pública con precios y propuesta de valor.
- [ ] Definir flujo de "primera junta" (demo, trial, contacto).

---

## 8. Análisis competitivo

### 8.1 Competencia directa

| Competidor | Modelo | Precio | Observación |
|------------|--------|--------|-------------|
| (A investigar) | — | — | Identificar soluciones específicas para JAC |

### 8.2 Competencia indirecta

| Alternativa | Por qué compiten |
|-------------|------------------|
| Excel / Google Sheets | Gratis, flexible, sin auditoría |
| Software contable genérico | Cobro, facturación; no requisitos ni cartas JAC |
| Desarrollo a medida | Solución única por junta; costo alto |

### 8.3 Posicionamiento propuesto

> "El único SaaS diseñado para JAC en Colombia: cobros, requisitos, cartas y auditoría en un solo lugar."

---

## 9. Áreas de investigación pendiente

### 9.1 Prioridad alta

| Área | Pregunta | Método sugerido |
|------|----------|-----------------|
| **Precios** | WTP por plan Básico (si no gratuito), Premium, overrides | Encuestas, entrevistas con 10–20 juntas |
| **Penetración** | Tasa de adopción realista año 1–3 | Benchmark sector, pilotos |
| **CAC** | Costo por junta adquirida por canal | Tracking por canal, pruebas piloto |
| **Facturación electrónica** | Obligación DIAN para el SaaS | Asesoría tributaria |

### 9.2 Prioridad media

| Área | Pregunta | Método sugerido |
|------|----------|-----------------|
| **Segmentación** | Tamaño típico (afiliados) por región | Datos públicos, encuestas |
| **Churn** | Causas de abandono, retención por plan | Análisis post-piloto |
| **LTV** | Valor promedio por junta en 12–24 meses | Modelo con datos de pilotos |
| **Competencia** | Soluciones existentes para JAC | Búsqueda, entrevistas |

### 9.3 Prioridad baja

| Área | Pregunta | Método sugerido |
|------|----------|-----------------|
| **Expansión** | Oportunidad en otros organismos comunales | Investigación de mercado |
| **Precios internacionales** | Viabilidad en otros países | Análisis normativo |

---

## 10. Referencias cruzadas

| Tema | Documento |
|------|-----------|
| Plan integral del sistema | `plan.md` |
| Flujos de suscripción y facturación | `FLUJOS_SUSCRIPCIONES_PLANES.md` |
| Overrides y precios por demanda | `MODELO_OVERRIDES_CONSUMO.md` |
| Checklist SaaS (infra, legal, UX) | `CHECKLIST_SAAS_PROFESIONAL.md` |
| Administrador de plataforma | `PLAN_ADMINISTRADOR_PLATAFORMA.md` |
| Wompi por junta (pagos afiliados) | `WOMPI_POR_JUNTA_DOC.md` |
| Legislación colombiana | `legal/INVESTIGACION_LEGISLACION_COLOMBIANA_JAC_SAAS.md` |
| Arquitectura y multi-tenant | `00_ARQUITECTURA_RECTOR copy.md` |

---

## Anexo A: Checklist de próximos pasos

- [ ] Validar precios con 5–10 juntas (entrevistas).
- [ ] Calcular ARPU y LTV con datos de pilotos.
- [ ] Definir canal principal de adquisición.
- [ ] Crear landing con precios y propuesta de valor.
- [ ] Evaluar obligación de facturación electrónica (DIAN).
- [ ] Documentar política de retención de datos.
- [ ] Actualizar este documento con hallazgos de investigación.

---

*Documento vivo. Actualizar con resultados de investigación y decisiones comerciales.*
