---
name: jac-wompi-integration
description: Implements end-to-end Wompi integration: payment intention, redirect, webhook, return verification, reconciliation job. Use when integrating with Wompi API, handling webhooks, verifying HMAC, or building the nightly reconciliation job. References flujoDePagos, flujoDePagosCasoFallaWebhook, flujoDePagosCondicionDeCarrera.
---

# Integración Wompi JAC

## Cuándo usar esta skill

- Crear intención de pago en Wompi (monto = deuda calculada en backend).
- Recibir y procesar webhook de Wompi (verificar firma, estado, monto).
- Implementar la página/endpoint de retorno tras el pago (consultar estado en Wompi y registrar si APPROVED).
- Implementar job de reconciliación (transacciones APPROVED del día vs base, registrar faltantes).

## Flujo resumido

1. Usuario/front solicita pagar → backend calcula deuda → crea intención en Wompi con ese monto exacto → devuelve URL/ref para redirigir.
2. Usuario paga en Wompi → Wompi envía webhook a nuestro backend.
3. Backend: verifica HMAC, estado APPROVED, monto; llama a una única función `registerPaymentFromProvider(transactionData)` que inserta en `pagos` con referenciaExterna = transactionId (unique). Idempotente: si ya existe esa referencia, no duplicar.
4. Retorno: cuando el usuario vuelve a la app, backend consulta estado de la transacción en la API de Wompi; si APPROVED, llama la misma lógica de registro (rescate si el webhook falló).
5. Reconciliación (job nocturno): listar transacciones APPROVED del día en Wompi; comparar con pagos ya registrados; para las faltantes, llamar la misma función de registro.

## Función única de registro

Tanto webhook como retorno como reconciliación deben usar la misma función (misma validación, misma transacción, mismo unique por referenciaExterna). Así se evitan duplicados y se garantiza coherencia.

## Seguridad

- Verificar firma/HMAC del webhook con el secret de Wompi antes de procesar.
- No confiar en el body sin verificación. Validar monto contra la intención o recalcular deuda dentro de transacción según diseño del proyecto.
- Transacción serializable al registrar pago para evitar doble pago por condición de carrera.

## Documentos de referencia

**flujoDePagos.md**, **flujoDePagosCasoFallaWebhook.md**, **flujoDePagosCondicionDeCarrera.md**.
