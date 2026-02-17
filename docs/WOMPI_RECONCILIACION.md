# Job de reconciliación Wompi

**Referencia:** `flujoDePagosCasoFallaWebhook.md`, `consecutivosYCronJobs.md`

---

## Objetivo

Comparar transacciones APPROVED en Wompi vs pagos en BD; registrar las faltantes. Capa 3 de blindaje ante fallo de webhook.

---

## Implementación

- **Servicio:** `WompiReconciliationService.ejecutar()`
- **Cron:** `WompiReconciliationCronService` – todos los días a las 02:00 (`0 2 * * *`)
- **Endpoint manual:** `POST /api/internal/wompi-reconcile` (solo PLATFORM_ADMIN)

---

## Estrategia

1. **Pagos junta (afiliados → junta):** Por cada junta con Wompi configurado, obtiene `IntencionPago` de los últimos 7 días. Para cada intención, consulta `GET /v1/payment_links/{id}` en Wompi. Si la respuesta incluye transacciones APPROVED no registradas, llama a `registrarPagoDesdeProveedor` (misma lógica que webhook y retorno).

2. **Facturas plataforma (junta → plataforma):** Similar con `IntencionPagoFactura` y credenciales env (`WOMPI_PRIVATE_KEY`).

---

## Limitación API Wompi

La API de Wompi Colombia para recibir pagos (`sandbox.wompi.co/v1`, `production.wompi.co/v1`) no documenta un endpoint para listar transacciones por fecha. El job usa `GET /v1/payment_links/{id}` para intentar obtener transacciones asociadas al link. Si la respuesta no incluye `transactions`, el job ejecuta pero no encontrará pagos que reconciliar.

En ese caso, las capas 1 (webhook) y 2 (verificación en retorno) siguen siendo las principales. El job queda como respaldo para cuando Wompi exponga o documente el endpoint.

---

## Ejecución manual

Para pruebas o rescate inmediato:

```bash
curl -X POST -H "Authorization: Bearer <JWT_PLATFORM_ADMIN>" \
  https://tu-dominio.com/api/internal/wompi-reconcile
```

Respuesta: `{ data: { registradosJunta, registradosFacturas, errores, intencionesRevisadas, intencionesFacturaRevisadas } }`
