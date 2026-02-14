📦 ARQUITECTURA DE DOMINIO – CAPA CORE (OFICIAL v1.1)

Aquí no escribimos controllers.
Aquí construimos el núcleo real del sistema.

Estos servicios:

No saben nada de HTTP

No conocen decorators de Nest

No retornan Response

No lanzan HttpException

No usan req ni res

No dependen de framework

Solo lógica de negocio pura, determinística y auditable.

Si esta capa está bien hecha, el sistema es defendible ante auditoría real.

📁 ESTRUCTURA OFICIAL
src/
 ├── domain/
 │    ├── services/
 │    │     ├── debt.service.ts
 │    │     ├── payment.service.ts
 │    │     ├── letter.service.ts
 │    │     ├── requisito.service.ts
 │    │     └── audit.service.ts
 │    ├── types/
 │    └── errors/
 ├── application/
 ├── infrastructure/
 └── controllers/


Separación real. No cosmética.

1️⃣ DebtService

Responsabilidad única:

Calcular deuda dinámica de JUNTA.

Nunca guarda deuda.
Nunca modifica datos.
Nunca actualiza estados.
Solo calcula.

Método principal
calculateUserDebt(params: {
  usuarioId: string;
  fechaCorte?: Date;
}): Promise<DebtResult>

Tipos
type DebtMonthDetail = {
  year: number;
  month: number;
  estadoLaboral: 'TRABAJANDO' | 'NO_TRABAJANDO';
  tarifaAplicada: number;
};

type DebtResult = {
  total: number;
  detalle: DebtMonthDetail[];
};

Lógica interna obligatoria

Obtener último pago tipo JUNTA

Determinar mes siguiente al último pago

Generar meses hasta fechaCorte (default = hoy)

Para cada mes:

Obtener estado laboral vigente en ese mes

Obtener tarifa vigente en ese mes

Acumular valores

Retornar resultado

Reglas estrictas

Si no hay historial laboral → ERROR

Si no hay tarifa vigente → ERROR

Si hay superposición de historial laboral → ERROR

No se ignoran inconsistencias

Nada silencioso.

2️⃣ PaymentService

Responsabilidad:

Registrar pago de JUNTA validando contra deuda exacta.

Nunca acepta monto libre desde frontend.

Método principal
registerJuntaPayment(params: {
  usuarioId: string;
  metodo: 'EFECTIVO' | 'TRANSFERENCIA' | 'ONLINE';
  registradoPorId: string;
  referenciaExterna?: string;
})

Flujo obligatorio

Calcular deuda con DebtService

Si deuda.total == 0 → ERROR

El monto del pago es EXACTAMENTE deuda.total

Crear registro Pago

Registrar auditoría

Retornar confirmación

Nunca recibe "monto" como input.

3️⃣ LetterService

Responsabilidad:

Validar requisitos y emitir carta laboral.

Toda emisión ocurre dentro de transacción.

Método principal
emitLetter(params: {
  cartaId: string;
  emitidaPorId: string;
})

Validaciones obligatorias

Deuda junta == 0

Existe pago tipo CARTA

Carta está en estado PENDIENTE

Validación de requisitos adicionales:

Obtener getRequisitosParaCarta(usuarioId, juntaId) → lista de { requisitoTipoId, nombre, obligacionActiva, estado }.

Para cada requisito con obligacionActiva=true → estado debe ser AL_DIA.

Si obligacionActiva=false → se omite validación de ese requisito.

Si algo falla → error explícito.

Proceso interno (transaccional)

Obtener consecutivo anual (tabla Consecutivo)

Incrementar valorActual

Generar qrToken seguro (UUID + hash)

Actualizar carta:

estado = APROBADA

consecutivo

anio

fechaEmision

emitidaPorId

Registrar auditoría

Todo dentro de una única transacción.

4️⃣ RequisitoService (v2 – requisitos adicionales dinámicos)

Responsabilidad:

Gestionar requisitos adicionales dinámicos por junta (agua, basura, etc.).

Es el único servicio autorizado para:

Cambiar estado (AL_DIA / MORA) por requisitoTipoId

Cambiar obligación (activa / exento) por requisitoTipoId

Ejecutar corte automático mensual (solo requisitos con tieneCorteAutomatico=true)

Insertar historial

Registrar auditoría

Nadie más puede modificar EstadoRequisito o HistorialRequisito.

4.1 Cambio manual de estado
updateEstadoRequisito(params: {
  requisitoTipoId: string;
  usuarioId: string;
  nuevoEstado: 'AL_DIA' | 'MORA';
  cambiadoPorId: string;
})


Proceso:

Obtener EstadoRequisito actual (usuarioId, requisitoTipoId)

Insertar HistorialRequisito:

tipoCambio = ESTADO

estadoAnterior, estadoNuevo

cambioAutomatico = false

Actualizar EstadoRequisito.estado

Registrar auditoría

4.2 Cambio de obligación (Exento / No exento)
updateObligacionRequisito(params: {
  requisitoTipoId: string;
  usuarioId: string;
  obligacionActiva: boolean;
  cambiadoPorId: string;
})


Proceso:

Obtener EstadoRequisito actual

Insertar HistorialRequisito:

tipoCambio = OBLIGACION

obligacionAnterior, obligacionNueva

cambioAutomatico = false

Actualizar EstadoRequisito.obligacionActiva

Registrar auditoría

Regla:

Cambiar obligación NO modifica automáticamente el estado.

4.3 Corte automático mensual (JOB del sistema)
applyMonthlyCutoff(params: {
  juntaId?: string;  // opcional: si no se pasa, procesa todas las juntas
})


Regla de negocio oficial:

Se ejecuta el día 1 de cada mes.

Itera sobre RequisitoTipo con tieneCorteAutomatico=true y activo=true.

Para cada requisito: usuarios con obligacionActiva=true y estado=AL_DIA → MORA.

Usuarios exentos no se tocan.

Proceso:

Para cada RequisitoTipo con tieneCorteAutomatico=true y activo=true:

Buscar EstadoRequisito donde obligacionActiva=true, estado=AL_DIA

Insertar HistorialRequisito (cambioAutomatico=true)

Actualizar EstadoRequisito.estado = MORA

Registrar auditoría.

Este método nunca depende de HTTP.
Lo ejecuta infraestructura (cron), pero la lógica vive aquí.

5️⃣ AuditService

Responsabilidad:

Registrar eventos críticos del sistema.

Nunca opcional.

Método genérico
registerEvent(params: {
  juntaId: string;
  entidad: string;
  entidadId: string;
  accion: string;
  metadata: any;
  ejecutadoPorId: string;
})


Toda operación crítica debe llamarlo.

🔐 REGLA DE ORO

Controllers solo:

Validan DTO

Llaman Service

Devuelven resultado

Nada más.

Si mañana cambias REST por GraphQL,
los services siguen intactos.

🚨 INVARIANTES DEL DOMINIO (NO NEGOCIABLES)

Nunca se guarda deuda.

Nunca se aceptan montos manipulables.

Nunca se genera carta sin validación completa.

Nunca se modifica EstadoRequisito fuera de RequisitoService.

Nunca se modifica HistorialRequisito fuera de RequisitoService.

Todo cambio crítico genera auditoría.

Ninguna operación ignora juntaId.

🧠 RESULTADO ARQUITECTÓNICO

Con esta capa:

✔ El sistema es auditable
✔ El sistema es defendible ante entes reguladores
✔ El modelo soporta SaaS multi-tenant
✔ La lógica está centralizada
✔ No hay acoplamiento con HTTP
✔ No hay duplicación de reglas