Flujo de Pago: Efectivo vs Online

(Pago de Junta – SIN pagos parciales)

Principio rector (no negociable)

📌 Ambos pagos terminan exactamente igual en el sistema
📌 La diferencia es solo quién inicia y quién confirma

El backend no sabe ni le importa si el pago fue efectivo u online.
Solo sabe: “este usuario pagó este monto total en esta fecha”.

1. Flujo de PAGO EFECTIVO (Presencial)
Actores

Usuario

Tesorera

Sistema

Paso a paso
Paso 1 – Usuario llega a la Junta

Solicita pagar su deuda de la junta.

Paso 2 – Tesorera consulta deuda

En el sistema:

GET /usuarios/{id}/deuda/detalle


El backend:

Calcula deuda completa

Devuelve monto total

NO guarda nada

📌 Importante:
Si la deuda es 26.000 → eso es lo único que puede pagar.

Paso 3 – Usuario paga en efectivo

Fuera del sistema (dinero físico).

Paso 4 – Tesorera registra el pago

En el sistema:

POST /pagos
{
  usuario_id,
  tipo: "junta",
  monto: 26000,
  metodo: "efectivo"
}


Backend valida:

Que el monto coincida exactamente con la deuda calculada

Que no exista pago duplicado del mismo periodo

Si todo está bien:

Guarda el pago

Registra auditoría

Fin del flujo

Paso 5 – Resultado

La deuda pasa a 0 (porque ahora el último pago es hoy)

El usuario queda al día

Puede solicitar carta

2. Flujo de PAGO ONLINE (Wompi)
Actores

Usuario

Plataforma de pagos (Wompi)

Backend

Paso a paso
Paso 1 – Usuario entra al sistema

Desde su cuenta.

Paso 2 – Consulta deuda
GET /usuarios/{id}/deuda


El sistema muestra:

Monto total

Botón “Pagar ahora”

📌 No hay input de monto.
📌 El usuario no elige cuánto paga.

Paso 3 – Inicia pago online

Frontend:

Solicita al backend crear intención de pago

POST /pagos/online/intencion


Backend:

Recalcula deuda

Crea intención en Wompi por ese valor exacto

Guarda referencia temporal (pendiente)

Paso 4 – Usuario paga en Wompi

Fuera del sistema.

Paso 5 – Webhook de Wompi

Wompi llama a:

POST /webhooks/wompi


Backend:

Verifica firma

Verifica estado = APROBADO

Verifica monto exacto

Paso 6 – Registro definitivo del pago

Backend crea:

pagos {
  usuario_id,
  tipo: "junta",
  monto,
  metodo: "online",
  referencia_wompi
}


Registra auditoría.

Paso 7 – Resultado

Usuario queda al día

Puede solicitar carta inmediatamente

No intervención humana

3. Qué NO existe en ningún flujo

❌ Pagos parciales
❌ Abonos
❌ “Pago adelantado”
❌ “Saldo a favor”
❌ Edición manual de pagos

Esto es intencional para:

Evitar enredos contables

Evitar corrupción

Evitar errores humanos

4. Método TRANSFERENCIA (registro manual)

Pago por transferencia bancaria: registro manual por TESORERA. referenciaExterna = número o consecutivo de la transferencia (identificador único). Validación manual, sin webhook. El flujo es similar al efectivo: TESORERA consulta deuda (o monto carta), usuario paga por transferencia fuera del sistema, TESORERA registra con metodo TRANSFERENCIA y referenciaExterna.

5. Pago tipo CARTA

Monto configurable por junta (admin o TESORERA). Se valida que el monto coincida con el configurado para esa junta (campo montoCarta en Junta). Ver plan.md §8.2.

6. Diferencia real entre efectivo, transferencia y online (resumen técnico)
Aspecto	Efectivo	Transferencia	Online
Quién inicia	Tesorera	Tesorera	Usuario
Quién confirma	Tesorera	Tesorera	Wompi (webhook)
referenciaExterna	—	Número transferencia	ID Wompi
Backend	Igual	Igual	Igual
Registro final	pagos	pagos	pagos
Auditoría	Sí	Sí	Sí

📌 La tabla pagos es la misma.

7. Punto crítico de seguridad (muy importante)

El backend NUNCA:

Confía en el monto enviado por frontend

Confía en que “el usuario dice que pagó”

Siempre:

Recalcula deuda

Valida monto

Valida estado

Esto evita:

Pagos incompletos

Manipulación del frontend

Errores de tesorería

8. Conclusión clara (para seguir planeando)

✔ Flujo único de negocio
✔ Dos canales de ejecución
✔ Un solo registro contable
✔ Sin excepciones ni atajos

Este diseño:

Es simple

Es defendible

Es escalable

Es imposible de “torcer” sin dejar rastro