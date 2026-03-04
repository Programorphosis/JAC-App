# Vigencia de pago tipo CARTA

**Referencia:** Flujo de solicitud de carta, pago consumido al aprobar.

## Campo `vigencia` en Pago

- **Tipo:** `Boolean?` (nullable)
- **Solo se valida para tipo CARTA.** Otros tipos (JUNTA) tienen `vigencia = null` por defecto.

## Reglas

| vigencia | Significado para tipo CARTA |
|----------|-----------------------------|
| `true`   | Vigente. El usuario puede solicitar carta. |
| `false`  | Consumido. La carta ya fue emitida con este pago. |
| `null`   | Inválido. No permite solicitar carta (legacy o no aplica). |

## Flujo

1. **Al registrar pago CARTA** (efectivo, transferencia u online): `vigencia = true`.
2. **Al aprobar/emitir carta**: se consume el pago más reciente con `vigencia = true` → `vigencia = false`.
3. **estado-general.pago_carta**: `true` solo si existe al menos un Pago tipo CARTA con `vigencia = true`.

## Datos legacy

Los pagos CARTA creados antes de esta migración tienen `vigencia = null` y se consideran inválidos.  
Para corregir datos existentes, ejecutar manualmente:

```sql
-- Marcar como consumidos los pagos de usuarios con cartas aprobadas
WITH pagos_ranked AS (
  SELECT p.id, ROW_NUMBER() OVER (
    PARTITION BY p."usuarioId", p."juntaId"
    ORDER BY p."fechaPago" DESC
  ) AS rn
  FROM "Pago" p WHERE p.tipo = 'CARTA'
),
aprobadas AS (
  SELECT "usuarioId", "juntaId", COUNT(*) AS n
  FROM "Carta" WHERE estado = 'APROBADA'
  GROUP BY "usuarioId", "juntaId"
)
UPDATE "Pago" p SET vigencia = false
FROM pagos_ranked pr
JOIN aprobadas a ON p."usuarioId" = a."usuarioId" AND p."juntaId" = a."juntaId"
WHERE p.id = pr.id AND pr.rn <= a.n;

-- El resto: vigentes
UPDATE "Pago" SET vigencia = true
WHERE tipo = 'CARTA' AND vigencia IS NULL;
```
