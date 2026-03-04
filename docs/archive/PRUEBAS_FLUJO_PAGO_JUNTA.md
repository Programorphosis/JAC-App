# Pruebas del flujo de pago de tarifa junta

Guía para configurar datos de prueba y validar el flujo de pago de cuota de junta.

## Requisitos para que un usuario pueda pagar

1. **Historial laboral**: Debe existir al menos un registro en `historial_laboral` que cubra cada mes a cobrar.
2. **Tarifa vigente**: Debe existir una tarifa con `fechaVigencia` ≤ último día del mes a cobrar.

## Campos importantes (no confundir)

| Campo | Tabla | Uso |
|-------|-------|-----|
| `fechaVigencia` | Tarifa | **Este** es el que usa el cálculo de deuda. Debe ser ≤ último día del mes. |
| `fechaCreacion` | Tarifa | Solo auditoría. No afecta el cálculo. |
| `fechaInicio` | HistorialLaboral | Inicio del periodo de estado laboral. |
| `fechaFin` | HistorialLaboral | Fin (null = vigente hasta hoy). |

## Ejemplo: Usuario creado en 2026, pagar enero 2026

1. **Usuario**: `fechaCreacion` = 2026-01-01 (o anterior).

2. **Historial laboral**: Crear registro con:
   - `estado` = TRABAJANDO o NO_TRABAJANDO
   - `fechaInicio` = 2026-01-01 (o anterior a ese mes)
   - `fechaFin` = null (vigente)

3. **Tarifa**: Debe existir con:
   - `estadoLaboral` = el mismo que el historial (TRABAJANDO o NO_TRABAJANDO)
   - `fechaVigencia` = 2026-01-01 o cualquier fecha ≤ 2026-01-31
   - **No** `fechaCreacion` – ese campo no se usa en el cálculo.

## Script para pgAdmin

Hay un script listo en `docs/scripts/seed-pruebas-pago-junta.sql`:

1. Abre el archivo en pgAdmin.
2. Reemplaza `TU_JUNTA_ID` y `TU_USUARIO_ID` con los UUID reales (o déjalos para auto-detectar la primera junta y usuario).
3. Ejecuta el script (F5).
4. Ejecuta las consultas de verificación al final.

## Consulta SQL para verificar tarifa vigente

```sql
-- Tarifas que aplican para enero 2026 (estado TRABAJANDO)
SELECT * FROM "Tarifa"
WHERE "juntaId" = 'TU_JUNTA_ID'
  AND "estadoLaboral" = 'TRABAJANDO'
  AND "fechaVigencia" <= '2026-01-31'
ORDER BY "fechaVigencia" DESC
LIMIT 1;
```

## Error 422 en estado-general (corregido)

Si el modificador veía error 422 al revisar requisitos de un usuario, era porque el cálculo de deuda fallaba (sin historial o sin tarifa vigente). Ahora el endpoint devuelve `deuda_junta: 0` en esos casos y la vista de requisitos funciona igual.
