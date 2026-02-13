👉 ¿Qué pasa si el pago online se aprueba pero el webhook falla?
👉 ¿Cómo evitamos que el usuario pague y el sistema no registre?

Excelente.
Ahora entramos en terreno serio de producto financiero.

Porque esto sí pasa en la vida real.

Escenario:

Usuario paga.

Wompi aprueba.

Tu webhook:

Se cae

Timeout

Error 500

Servidor apagado

El pago existe en Wompi…

Pero tu sistema nunca lo registró.

Resultado:
El usuario pagó.
Tu sistema dice que no.
Tienes un problema reputacional.

🎯 Regla de oro

Nunca dependas 100% del webhook para confirmar un pago.

El webhook es un disparador.
No es la única fuente de verdad.

🧠 Arquitectura correcta (nivel profesional)

Se soluciona con 3 mecanismos:

1️⃣ Idempotencia obligatoria

Ya lo dijimos:

referenciaExterna String? @unique


Eso permite que si el webhook llega 1, 2 o 5 veces,
solo se registre una vez.

2️⃣ Endpoint de verificación manual (pull, no solo push)

Cuando el usuario regresa del pago (redirect URL):

NO debes mostrar:

"Pago exitoso"

Debes hacer esto:

Recibir transactionId

Consultar a Wompi API directamente:

¿Está APPROVED?

¿Está DECLINED?

¿Está PENDING?

Si está APPROVED:
→ Intentas registrar el pago tú mismo (misma lógica del webhook).

Eso significa que:

Aunque el webhook falle,
tu frontend puede rescatar el pago.

Flujo correcto real:

Usuario paga →
Wompi procesa →
Usuario vuelve a tu app →
Tu backend consulta a Wompi →
Registra pago →
Fin.

El webhook queda como respaldo.

3️⃣ Job de reconciliación (blindaje empresarial)

Este es nivel SaaS serio.

Cada noche:

Consultas a Wompi:

Trae todas las transacciones APPROVED del día

Comparas contra tu base:

¿Cuáles no están registradas?

Registra las faltantes

Eso elimina cualquier pago perdido.

🧨 Entonces ¿qué pasa si webhook falla?

Caso A:
El usuario vuelve a tu app
→ Tu backend consulta
→ Se registra igual
→ Todo bien

Caso B:
El usuario cierra navegador
Webhook falló
→ No se registró

En la noche:

Job de reconciliación lo detecta
→ Lo registra automáticamente

Cero pérdida.

🧱 Diseño limpio de la lógica

Función única:

registerPaymentFromProvider(transactionData)


La usan:

Webhook

Endpoint de retorno

Job nocturno

Misma función.
Misma validación.
Misma transacción serializable.

Eso evita inconsistencias.

🚨 Error que debes evitar

No confíes solo en:

"Si webhook responde 200 ya quedó"

Porque:

Puede responder 200 pero fallar antes de commit

Puede que Wompi no reintente

Puede que tu servidor estuviera caído

Siempre debes poder consultar estado manualmente.

🎯 Cómo queda tu sistema blindado

Capa 1: Webhook
Capa 2: Verificación en retorno
Capa 3: Reconciliación nocturna
Capa 4: Idempotencia por referenciaExterna
Capa 5: Transacción serializable

Eso ya es arquitectura de fintech pequeña.

📌 Resumen claro

Si el pago se aprueba y webhook falla:

No pasa nada
Porque:

✔ Puedes consultarlo al volver el usuario
✔ Puedes reconciliarlo después
✔ No puedes duplicarlo por unique constraint
✔ No puedes romper estado por serializable