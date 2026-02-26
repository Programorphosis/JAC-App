+# Modelo de overrides por consumo (exceso de límites)

**Fecha:** 2025-02-18  
**Estado:** Modelo de negocio definido. Implementación actual difiere (solicitud manual + pago único).

---

## 1. Principio

Los **overrides no se solicitan**. Son automáticos cuando la junta supera los límites del plan. Los planes con `esPersonalizable` definen precios por unidad adicional (carta, MB, usuario).

---


## 2. Información al elegir plan

Al elegir un plan, el usuario debe ver:

- Límites del plan (usuarios, storage MB, cartas/mes)
- **Precios por exceso** (COP por usuario adicional, COP por MB adicional, COP por carta adicional)
- Así sabe de antemano cuánto le costará si supera los límites

---

## 3. Cuándo se facturan los overrides

| Dimensión | Frecuencia | Cálculo |
|-----------|------------|---------|
| **Cartas** | Mensual | Exceso del mes × precioPorCartaAdicional. Se reinicia cada mes. |
| **Usuarios** | Mensual | Exceso actual (usuarios - límite) × precioPorUsuarioAdicional. Se recalcula cada mes (pueden agregar/borrar). |
| **Storage MB** | Mensual | Exceso actual (MB usados - límite) × precioPorMbAdicional. Se recalcula cada mes. |

**Importante:** La facturación de overrides es **mensual** incluso para planes anuales. Evita que un usuario anual espere todo el año y reciba una factura grande al renovar.

---

## 4. Acumulación y pago

- Las facturas de overrides se generan mensualmente.
- Son **acumulables**: el usuario puede tener varias facturas pendientes y elegir cuándo pagar.
- Ejemplo: este mes 20 cartas de más → se agrega a la factura y se reinicia el contador de cartas. El usuario puede pagar ahora o acumular con otras facturas.

---

## 5. Experiencia del usuario

- **Informar** cuando la junta supera los límites.
- **Mostrar** cuánto está gastando en overrides (en tiempo real o resumen mensual).
- **Recomendar** upgrade de plan si el exceso es recurrente.

---

## 6. Planes no personalizables

Si el plan no es personalizable (`esPersonalizable = false`), no hay precios por demanda. En ese caso:

- No se calculan overrides automáticos.
- Si se superan los límites, el sistema puede bloquear (según política) o alertar.
- No tiene sentido "solicitar overrides" en un plan no personalizable.

---

## 7. Flujo técnico (modelo deseado)

```
1. Cron mensual (o al día de corte de cada suscripción):
   - Por cada junta con suscripción ACTIVA/PRUEBA y plan esPersonalizable:
   - Calcular exceso por dimensión vs límites efectivos
   - Si hay exceso > 0: crear Factura tipo OVERRIDE (o línea en factura de renovación)
   - Monto = SUM(exceso × precioPorUnidad) por dimensión

2. Para planes anuales:
   - Los overrides se facturan mensualmente (no al final del año)
   - Cada mes se genera factura de overrides si hay exceso

3. Cartas: contador del mes, se reinicia
4. Usuarios: snapshot al momento del cálculo
5. Storage: snapshot al momento del cálculo
```

---

## 8. Implementación actual vs. modelo deseado

| Aspecto | Actual | Deseado |
|---------|--------|---------|
| Origen | Usuario solicita en SolicitarOverridesDialog | Automático al superar límites |
| Facturación | Pago único al solicitar | Mensual, acumulable |
| Planes anuales | Overrides al solicitar (cuando quiera) | Overrides facturados cada mes |
| overrideLimite* en Suscripción | Valores solicitados y pagados | No aplica; se usa límite del plan + exceso calculado |
| UI | Botón "Solicitar overrides" | Alertas de exceso, recomendación de upgrade |

---

## 9. Referencias

- `FLUJOS_SUSCRIPCIONES_PLANES.md` – Flujo 7 (Overrides)
- `REVISION_EXHAUSTIVA_SUSCRIPCIONES_PLANES.md` – Cálculo delta (base para exceso)
