📘 DOCUMENTO OFICIAL – Flujo Unificado de Solicitud de Carta
(Alineado con Arquitectura Multi-Tenant y Modelo Prisma)
1️⃣ Principio Arquitectónico del Módulo de Cartas
📌 Regla Fundamental

No existen dos tipos de carta.

Existe un único flujo de negocio.

“Digital” y “Presencial” solo cambian quién ejecuta las acciones.

El backend NO distingue el canal.

Todo está gobernado por junta_id.

2️⃣ Modelo de Datos Involucrado (Prisma Alineado)

Todas las entidades incluyen:

junta_id UUID NOT NULL
@@index([junta_id, id])

2.1 Tablas involucradas (nombres del schema: camelCase)

**cartas:** id, juntaId, usuarioId, consecutivo, anio, estado (PENDIENTE | APROBADA | RECHAZADA), qrToken, fechaSolicitud, fechaEmision, emitidaPorId, rutaPdf (opcional), motivoRechazo (opcional), hashDocumento (opcional).

**pagos:** id, juntaId, usuarioId, tipo (JUNTA | CARTA), metodo (EFECTIVO | TRANSFERENCIA | ONLINE), monto, consecutivo, referenciaExterna, registradoPorId, fechaPago.

**documentos:** id, usuarioId, tipo, rutaS3, subidoPorId, fechaSubida. (Documentos de soporte: la validación de requisitos adicionales para emitir carta se hace por EstadoRequisito, no por estado en Documento.)

**auditoria:** id, juntaId, entidad, entidadId, accion, metadata, ejecutadoPorId, fecha.

3️⃣ Regla de Seguridad Obligatoria
3.1 JWT debe incluir

user_id

junta_id

rol

3.2 Regla crítica de backend

Ninguna consulta puede ejecutarse sin:

where: {
  junta_id: user.junta_id
}


Ejemplo correcto:

where: {
  junta_id: user.junta_id,
  id: cartaId
}


Ejemplo prohibido:

where: { id: cartaId }


Nunca confiar en junta_id enviado desde frontend.

4️⃣ Flujo Unificado de Solicitud de Carta
🔹 4.1 Flujo DIGITAL (Usuario Autónomo)
Actores

Usuario

Backend

Secretaria (valida)

Paso 1 – Usuario consulta estado general
GET /usuarios/{id}/estado-general


Backend calcula dinámicamente:

deuda junta (sumatoria de deudas activas)

requisitos adicionales (según EstadoRequisito por cada RequisitoTipo activo: AL_DIA o MORA; obligacionActiva indica si aplica)

existencia de pago tipo CARTA

Respuesta ejemplo:

{
  "deuda_junta": 0,
  "requisitos": [{ "nombre": "agua", "obligacionActiva": true, "estado": "AL_DIA" }],
  "pago_carta": true
}


⚠ No se almacenan estados calculados permanentes.

Paso 2 – Usuario sube recibo de agua
POST /documentos

Acciones backend: guarda archivo en S3, crea registro en Documento (tipo, rutaS3, subidoPorId). La condición “agua al día” para poder emitir carta se valida con EstadoRequisito (el modificador del RequisitoTipo marca AL_DIA), no con un estado en Documento.

Paso 3 – Usuario paga carta

Puede ser:

Online

Transferencia

Registrado manualmente por secretaria

Se crea:

POST /pagos
{
  "usuario_id": "...",
  "tipo": "carta",
  "monto": 3000,
  "metodo": "online"
}


Siempre con junta_id del token.

Paso 4 – Usuario solicita carta
POST /cartas/solicitar


Backend:

Valida que no exista carta pendiente

Crea registro:

estado = pendiente

fecha_solicitud = now()

No genera PDF todavía.

Registra auditoría.

Paso 5 – Secretaria valida solicitud

Vista administrativa muestra: estado financiero calculado, documento(s) de agua (soporte), pago tipo CARTA.

Acción: POST /cartas/{id}/validar

Backend ejecuta validaciones automáticas: deuda junta = 0; todos los requisitos adicionales con obligacionActiva=true deben estar AL_DIA según EstadoRequisito; pago tipo CARTA existe y confirmado.

Si todo OK: estado → APROBADA; fechaEmision → now(); emitidaPorId → secretaria_id; genera PDF; guarda rutaPdf (y opcionalmente hashDocumento); registra auditoría.

🔹 4.2 Flujo PRESENCIAL (Usuario Asistido)

📌 MISMO backend
📌 MISMAS tablas
📌 MISMAS reglas de validación

La única diferencia:
👉 La secretaria ejecuta las acciones en nombre del usuario.

Paso 1 – Usuario llega a oficina

Solicita carta.

Paso 2 – Secretaria consulta estado
GET /usuarios/{id}/estado-general

Paso 3 – Recibo físico

Secretaria:

Toma foto

Sube archivo

POST /documentos

Paso 4 – Pago en efectivo

Secretaria registra:

POST /pagos
{
  "usuario_id": "...",
  "tipo": "carta",
  "monto": 3000,
  "metodo": "efectivo"
}

Paso 5 – Secretaria crea y valida carta
POST /cartas/solicitar
POST /cartas/{id}/validar


Puede validar inmediatamente si cumple condiciones.

5️⃣ Resultado Final (Ambos Flujos)

✔ Carta emitida
✔ PDF generado
✔ Pago registrado
✔ Documento almacenado
✔ Auditoría completa
✔ Aislamiento por junta_id garantizado

El sistema no sabe si fue digital o presencial.
El negocio es uno solo.

6️⃣ Reglas Técnicas Críticas

Nunca generar PDF si estado ≠ aprobada.

No permitir múltiples cartas pendientes por usuario.

No permitir validar si: existe deuda; algún requisito con obligacionActiva=true no está AL_DIA; pago tipo CARTA inexistente. Para cartas rechazadas puede guardarse motivoRechazo (opcional).

Toda acción debe registrar auditoría.

Todas las consultas incluyen junta_id.

No almacenar estados financieros permanentes (se calculan).

7️⃣ Escalabilidad Futura

Este flujo permite:

Migración futura a DB por junta

Subdominios por junta

Automatización de validación

Emisión automática con reglas configurables

Convertirse en módulo SaaS comercial independiente

Sin romper arquitectura actual.

8️⃣ Filosofía del Módulo

Primero:

✔ Correcto
✔ Seguro
✔ Auditado

Después:

✔ Automatizado
✔ Optimizado
✔ Escalable

Nunca al revés.