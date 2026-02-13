⚠️ EL PROBLEMA REAL

Escenario:

Usuario debe 26.000

Abre dos pestañas

Genera dos intenciones de pago

Paga ambas casi al mismo tiempo

Wompi envía dos webhooks simultáneos

Si no haces nada especial:

Ambos recalculan deuda = 26.000

Ambos intentan registrar pago

Terminas con DOS pagos de 26.000

Y deuda negativa implícita (aunque no la guardes)

Eso es una condición de carrera clásica.

🎯 OBJETIVO

Garantizar que:

✔ Solo un pago pueda registrarse para ese periodo
✔ El segundo webhook falle limpiamente
✔ No haya doble registro
✔ El sistema sea transaccional

🧠 SOLUCIÓN ARQUITECTÓNICA CORRECTA

Hay tres capas de protección.

Si implementas solo una, eres vulnerable.

CAPA 1 — Transacción SERIALIZABLE (Base de Datos)

En PostgreSQL puedes usar:

SERIALIZABLE


Eso hace que si dos transacciones intentan modificar datos dependientes del mismo estado lógico, una falle.

En Prisma:

await prisma.$transaction(async (tx) => {
   // recalcular deuda
   // validar
   // insertar pago
}, {
   isolationLevel: 'Serializable'
});


Si dos intentan registrar al mismo tiempo:

Una gana.
La otra revienta con error de serialización.

Ese error lo capturas y lo manejas como:

"Pago ya registrado o estado cambiado. Reintente."

CAPA 2 — Revalidación DENTRO de la transacción

Clave crítica.

No recalculas deuda antes de la transacción.

La recalculas DENTRO.

Mal diseño:

const deuda = calculateDebt();
await prisma.pago.create(...);


Buen diseño:

await prisma.$transaction(async (tx) => {

  const deuda = await debtService.calculateUserDebtTx(tx, usuarioId);

  if (deuda.total === 0) {
     throw new Error('Usuario ya está al día');
  }

  await tx.pago.create(...);

});


Así el cálculo y el insert están en el mismo contexto atómico.

CAPA 3 — Idempotencia por referenciaExterna

Tu modelo tiene:

referenciaExterna String?


Eso debe ser:

@unique


Si Wompi envía el mismo webhook dos veces (pasa mucho):

El segundo insert fallará automáticamente por unique constraint.

Eso elimina duplicados del mismo transactionId.

🔒 CAPA EXTRA (Opcional pero profesional)

Bloqueo optimista por periodo lógico.

Podrías crear un constraint indirecto:

Un pago tipo JUNTA no puede existir si la deuda al momento es 0.

Eso ya lo cubre la recalculación dentro de transacción.

No necesitas más.

🧨 QUÉ PASA EN LA PRÁCTICA

Si dos webhooks llegan simultáneos:

Transacción A:

recalcula deuda = 26.000

inserta pago

commit

Transacción B:

recalcula deuda

ahora deuda = 0

lanza error

rollback

Resultado:

✔ Solo un pago queda
✔ No hay corrupción
✔ No hay doble registro
✔ Sistema íntegro

🏗️ Qué debes ajustar en tu modelo Prisma

Solo una cosa:

En Pago:

referenciaExterna String? @unique


Eso es obligatorio para pagos online.

🚨 Error común que debes evitar

NO hagas esto:

Guardar "periodoPagado"

Guardar "mesPagado"

Guardar "saldoAnterior"

Eso complica todo.

Tu modelo actual basado en último pago es mucho más robusto.

🎖️ Nivel Auditoría

Si mañana alguien dice:

"Yo pagué dos veces"

Puedes probar:

El primer pago fue aprobado

El segundo fue rechazado por estado ya actualizado

O fue bloqueado por constraint único

Eso es trazabilidad real.

📌 Resumen Claro

Para bloquear doble pago simultáneo necesitas:

Transacciones SERIALIZABLE

Recalcular deuda dentro de la transacción

Unique constraint en referenciaExterna

Manejo explícito de error de serialización

Con eso el sistema queda blindado.