📘 DOCUMENTO OFICIAL – MÓDULO DE AGUA
(Alineado 100% al modelo Prisma actual)
1️⃣ Propósito del Módulo

El módulo de agua gestiona el estado administrativo oficial del agua de cada usuario.

El sistema:

❌ No procesa dinero de agua

❌ No guarda pagos de agua

❌ No calcula deuda monetaria

✅ Mantiene estado oficial (AL_DIA / MORA)

✅ Ejecuta cambio automático mensual

✅ Permite excepción mediante obligacionActiva

2️⃣ Modelo Oficial (Congelado)
model EstadoAgua {
  usuarioId           String   @id
  usuario             Usuario  @relation(fields: [usuarioId], references: [id])

  estado              EstadoAguaTipo
  obligacionActiva    Boolean  @default(true)

  fechaUltimoCambio   DateTime @default(now())

  historial           HistorialAgua[]

  @@index([obligacionActiva])
}

model HistorialAgua {
  id                 String           @id @default(uuid())

  usuarioId          String
  usuario            Usuario          @relation(fields: [usuarioId], references: [id])

  tipoCambio         TipoCambioAgua

  estadoAnterior     EstadoAguaTipo?
  estadoNuevo        EstadoAguaTipo?

  obligacionAnterior Boolean?
  obligacionNueva    Boolean?

  cambiadoPorId      String?
  cambiadoPor        Usuario? @relation("AguaCambiadoPor", fields: [cambiadoPorId], references: [id])

  cambioAutomatico   Boolean  @default(false)

  fechaCambio        DateTime @default(now())

  @@index([usuarioId])
}

3️⃣ Multi-Tenant (Cómo se respeta)

EstadoAgua no tiene juntaId porque:

Usuario ya tiene juntaId

El aislamiento se hace vía relación

Toda consulta debe ser así:

where: {
  usuario: {
    juntaId: user.juntaId
  }
}


Nunca:

where: { usuarioId }


Sin filtrar por junta indirectamente.

4️⃣ Conceptos Clave del Modelo
estado

Puede ser:

AL_DIA

MORA

Representa el estado administrativo actual.

obligacionActiva

Es la verdadera excepción.

true → el usuario debe pagar agua

false → el usuario es exento

Si obligacionActiva = false:

No se le aplica mora automática

Puede estar AL_DIA permanentemente

Puede emitir carta aunque otros estén en mora

Este campo es la excepción formal.

Solo ADMIN puede cambiarlo.

5️⃣ Flujo Manual (Receptor de Agua)
Escenario: Usuario paga el agua

Paso 1
Usuario paga fuera del sistema.

Paso 2
Receptor valida manualmente.

Paso 3
Receptor marca AL_DIA.

Endpoint:

POST /usuarios/:id/agua
{
  estado: "AL_DIA"
}

Lógica del WaterService

Validar rol RECEPTOR_AGUA

Validar que usuario pertenezca a la junta

Obtener estado actual

Verificar que no sea el mismo estado

Transacción:

await prisma.$transaction([
  prisma.estadoAgua.update({
    where: { usuarioId },
    data: {
      estado: 'AL_DIA',
      fechaUltimoCambio: new Date()
    }
  }),

  prisma.historialAgua.create({
    data: {
      usuarioId,
      tipoCambio: 'ESTADO',
      estadoAnterior: estadoActual.estado,
      estadoNuevo: 'AL_DIA',
      cambiadoPorId: receptorId,
      cambioAutomatico: false
    }
  })
]);


Nunca se cambia estado sin historial.

6️⃣ Cambio de Obligación (Exención)

Solo ADMIN puede hacer:

PATCH /usuarios/:id/agua/obligacion
{
  obligacionActiva: false
}


Transacción:

await prisma.$transaction([
  prisma.estadoAgua.update({
    where: { usuarioId },
    data: { obligacionActiva: false }
  }),

  prisma.historialAgua.create({
    data: {
      usuarioId,
      tipoCambio: 'OBLIGACION',
      obligacionAnterior: true,
      obligacionNueva: false,
      cambiadoPorId: adminId,
      cambioAutomatico: false
    }
  })
]);

7️⃣ Flujo Automático Mensual (Día 1)
Regla Oficial

El día 1 de cada mes:

Todos los usuarios con obligacionActiva = true pasan a MORA.

No importa si estaban AL_DIA.
No depende de fecha individual.
Es regla administrativa global.

Implementación Técnica

Proceso:

Buscar todos los EstadoAgua donde:

obligacionActiva = true

estado = AL_DIA

Transacción masiva:

await prisma.$transaction(async (tx) => {

  const usuarios = await tx.estadoAgua.findMany({
    where: {
      obligacionActiva: true,
      estado: 'AL_DIA'
    }
  });

  await tx.estadoAgua.updateMany({
    where: {
      obligacionActiva: true,
      estado: 'AL_DIA'
    },
    data: {
      estado: 'MORA',
      fechaUltimoCambio: new Date()
    }
  });

  await tx.historialAgua.createMany({
    data: usuarios.map(u => ({
      usuarioId: u.usuarioId,
      tipoCambio: 'ESTADO',
      estadoAnterior: 'AL_DIA',
      estadoNuevo: 'MORA',
      cambioAutomatico: true
    }))
  });

});


No se modifica obligacionActiva.

8️⃣ Integración con Carta

En LetterService:

if (
  estadoAgua.estado !== 'AL_DIA' &&
  estadoAgua.obligacionActiva === true
) {
  throw new Error('Usuario no está al día con el agua');
}


Si obligacionActiva = false → no bloquea.

No hay override manual.
No hay excepciones invisibles.

9️⃣ Reglas Duras del Sistema

El estado cambia automáticamente el día 1.

Nunca se cambia estado sin historial.

El sistema no registra dinero de agua.

La excepción se controla solo con obligacionActiva.

Toda consulta debe respetar multi-tenant vía Usuario.

No existe cálculo automático individual.

No existe deuda monetaria de agua.

🔟 Secuencia Técnica
Manual

Receptor
→ POST cambio estado
→ WaterService
→ update estado
→ create historial
→ auditoría

Automático

Cron día 1
→ WaterService.runMonthlyJob()
→ updateMany
→ createMany historial
→ auditoría global

1️⃣1️⃣ Resultado Arquitectónico

✔ Agua independiente del módulo financiero
✔ Mora automática uniforme
✔ Exentos controlados formalmente
✔ Multi-tenant respetado vía Usuario
✔ Historial completo
✔ Auditable
✔ Defendible ante comunidad