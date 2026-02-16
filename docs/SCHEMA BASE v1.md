generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

//////////////////////////////////////////////////////
// ENUMS
//////////////////////////////////////////////////////

enum RolNombre {
  PLATFORM_ADMIN
  ADMIN
  SECRETARIA
  TESORERA
  RECEPTOR_AGUA
  AFILIADO
}

enum EstadoLaboralTipo {
  TRABAJANDO
  NO_TRABAJANDO
}

enum MetodoPago {
  EFECTIVO
  TRANSFERENCIA
  ONLINE
}

enum TipoPago {
  JUNTA
  CARTA
}

enum EstadoRequisitoTipo {
  AL_DIA
  MORA
}

enum EstadoCartaTipo {
  PENDIENTE
  APROBADA
  RECHAZADA
}

enum TipoCambioRequisito {
  ESTADO
  OBLIGACION
}

//////////////////////////////////////////////////////
// JUNTA (multi-tenant base)
//////////////////////////////////////////////////////

model Junta {
  id              String   @id @default(uuid())
  nombre          String
  nit             String?  @unique
  fechaCreacion   DateTime @default(now())

  // Cuota que cobra esta junta por emitir una carta laboral. Se valida en pagos tipo CARTA.
  montoCarta      Int?

  usuarios        Usuario[]
  // Cuotas mensuales de afiliación por estado laboral (TRABAJANDO / NO_TRABAJANDO), versionadas por fecha. Se usan para calcular la deuda de junta (calculadoraDeDeuda).
  tarifas         Tarifa[]
  consecutivos    Consecutivo[]
  pagos           Pago[]
  requisitos     RequisitoTipo[]
  cartas          Carta[]
  auditorias      Auditoria[]
}

//////////////////////////////////////////////////////
// USUARIOS
//////////////////////////////////////////////////////

model Usuario {
  id                String   @id @default(uuid())
  juntaId           String?  // null = usuario Platform Admin (no pertenece a ninguna junta)
  junta             Junta?   @relation(fields: [juntaId], references: [id])

  tipoDocumento     String
  numeroDocumento   String
  nombres           String
  apellidos         String
  telefono          String?
  direccion         String?
  activo            Boolean  @default(true)
  fechaCreacion     DateTime @default(now())
  passwordHash      String   // bcrypt hash; requerido para login (añadido v1.1)

  roles             UsuarioRol[]
  historialLaboral  HistorialLaboral[]
  pagos             Pago[]
  cartas            Carta[]
  estadosRequisito  EstadoRequisito[]
  historialRequisito HistorialRequisito[]
  documentos        Documento[]

  @@unique([juntaId, numeroDocumento])
  @@index([juntaId])
}

//////////////////////////////////////////////////////
// ROLES
//////////////////////////////////////////////////////

model Rol {
  id        String     @id @default(uuid())
  nombre    RolNombre  @unique
  usuarios  UsuarioRol[]
}

model UsuarioRol {
  usuarioId String
  rolId     String

  usuario   Usuario @relation(fields: [usuarioId], references: [id])
  rol       Rol     @relation(fields: [rolId], references: [id])

  @@id([usuarioId, rolId])
}

//////////////////////////////////////////////////////
// HISTORIAL LABORAL
//////////////////////////////////////////////////////

model HistorialLaboral {
  id            String             @id @default(uuid())
  usuarioId     String
  usuario       Usuario            @relation(fields: [usuarioId], references: [id])

  estado        EstadoLaboralTipo
  fechaInicio   DateTime
  fechaFin      DateTime?

  creadoPorId   String
  creadoPor     Usuario            @relation("HistorialCreadoPor", fields: [creadoPorId], references: [id])

  fechaCreacion DateTime           @default(now())

  @@index([usuarioId])
}

//////////////////////////////////////////////////////
// TARIFAS – Cuotas mensuales de junta (versionadas por junta y fecha)
//////////////////////////////////////////////////////
// Una junta tiene muchas tarifas: por estado laboral (TRABAJANDO / NO_TRABAJANDO)
// y por fecha de vigencia. Ej.: TRABAJANDO = 20.000/mes desde 2024-01-01;
// NO_TRABAJANDO = 3.000/mes desde 2024-01-01. Sirven para calcular la deuda
// (suma de cuotas vencidas según historial laboral por mes). No confundir con
// montoCarta en Junta, que es el valor fijo por emitir una carta.

model Tarifa {
  id             String   @id @default(uuid())
  juntaId        String
  junta          Junta    @relation(fields: [juntaId], references: [id])

  estadoLaboral  EstadoLaboralTipo
  valorMensual   Int
  fechaVigencia  DateTime

  fechaCreacion  DateTime @default(now())

  @@index([juntaId, estadoLaboral, fechaVigencia])
}

//////////////////////////////////////////////////////
// PAGOS
//////////////////////////////////////////////////////

model Pago {
  id                String     @id @default(uuid())

  juntaId           String
  junta             Junta      @relation(fields: [juntaId], references: [id])

  usuarioId         String
  usuario           Usuario    @relation(fields: [usuarioId], references: [id])

  tipo              TipoPago
  metodo            MetodoPago
  monto             Int

  consecutivo       Int
  referenciaExterna String?    @unique  // idempotencia pagos online (Wompi); evita doble registro

  registradoPorId   String
  registradoPor     Usuario    @relation("PagoRegistradoPor", fields: [registradoPorId], references: [id])

  fechaPago         DateTime   @default(now())

  @@unique([juntaId, tipo, consecutivo])
  @@index([juntaId])
  @@index([usuarioId])
}

//////////////////////////////////////////////////////
// REQUISITOS ADICIONALES (agua, basura, etc.)
//////////////////////////////////////////////////////

model RequisitoTipo {
  id                   String   @id @default(uuid())
  juntaId              String
  junta                Junta    @relation(fields: [juntaId], references: [id])

  nombre               String
  modificadorId        String?
  modificador          Usuario? @relation("RequisitoModificador", fields: [modificadorId], references: [id])
  tieneCorteAutomatico Boolean  @default(true)
  activo               Boolean  @default(true)
  fechaCreacion        DateTime @default(now())

  estados              EstadoRequisito[]
  historial            HistorialRequisito[]

  @@index([juntaId])
}

model EstadoRequisito {
  usuarioId           String
  usuario             Usuario  @relation(fields: [usuarioId], references: [id])
  requisitoTipoId     String
  requisitoTipo       RequisitoTipo @relation(fields: [requisitoTipoId], references: [id], onDelete: Cascade)

  estado              EstadoRequisitoTipo
  obligacionActiva    Boolean  @default(true)
  fechaUltimoCambio   DateTime @default(now())

  @@id([usuarioId, requisitoTipoId])
  @@index([requisitoTipoId])
}

model HistorialRequisito {
  id                 String           @id @default(uuid())

  usuarioId          String
  usuario            Usuario         @relation(fields: [usuarioId], references: [id])
  requisitoTipoId    String
  requisitoTipo      RequisitoTipo    @relation(fields: [requisitoTipoId], references: [id], onDelete: Cascade)

  tipoCambio         TipoCambioRequisito

  estadoAnterior     EstadoRequisitoTipo?
  estadoNuevo        EstadoRequisitoTipo?

  obligacionAnterior Boolean?
  obligacionNueva    Boolean?

  cambiadoPorId      String?
  cambiadoPor        Usuario? @relation("RequisitoCambiadoPor", fields: [cambiadoPorId], references: [id])

  cambioAutomatico   Boolean  @default(false)
  fechaCambio        DateTime @default(now())

  @@index([usuarioId])
  @@index([requisitoTipoId])
}

//////////////////////////////////////////////////////
// CARTAS
//////////////////////////////////////////////////////

model Carta {
  id              String            @id @default(uuid())

  juntaId         String
  junta           Junta             @relation(fields: [juntaId], references: [id])

  usuarioId       String
  usuario         Usuario           @relation(fields: [usuarioId], references: [id])

  consecutivo     Int
  anio            Int

  estado          EstadoCartaTipo
  qrToken         String            @unique

  fechaSolicitud  DateTime          @default(now())
  fechaEmision    DateTime?

  emitidaPorId    String?
  emitidaPor      Usuario?          @relation("CartaEmitidaPor", fields: [emitidaPorId], references: [id])

  rutaPdf         String?
  hashDocumento   String?
  motivoRechazo   String?

  @@unique([juntaId, anio, consecutivo])
  @@index([juntaId])
  @@index([usuarioId])
}

//////////////////////////////////////////////////////
// DOCUMENTOS
//////////////////////////////////////////////////////

model Documento {
  id           String   @id @default(uuid())

  usuarioId    String
  usuario      Usuario  @relation(fields: [usuarioId], references: [id])

  tipo         String
  rutaS3       String

  subidoPorId  String
  subidoPor    Usuario  @relation("DocumentoSubidoPor", fields: [subidoPorId], references: [id])

  fechaSubida  DateTime @default(now())

  @@index([usuarioId])
}

//////////////////////////////////////////////////////
// CONSECUTIVOS
//////////////////////////////////////////////////////

model Consecutivo {
  id          String   @id @default(uuid())

  juntaId     String
  junta       Junta    @relation(fields: [juntaId], references: [id])

  tipo        String
  anio        Int
  valorActual Int

  @@unique([juntaId, tipo, anio])
}

//////////////////////////////////////////////////////
// AUDITORIA CENTRAL
//////////////////////////////////////////////////////

model Auditoria {
  id             String   @id @default(uuid())

  juntaId        String
  junta          Junta    @relation(fields: [juntaId], references: [id])

  entidad        String
  entidadId      String
  accion         String
  metadata       Json

  ejecutadoPorId String
  ejecutadoPor   Usuario  @relation(fields: [ejecutadoPorId], references: [id])

  fecha          DateTime @default(now())

  @@index([juntaId])
  @@index([entidad])
}






🔒 ESTADO

Este modelo queda oficialmente congelado como:

SCHEMA BASE v1.0

A partir de aquí:

No se agregan campos sin justificación formal

No se eliminan relaciones

No se simplifica por comodidad

No se mezclan responsabilidades

---

📋 CHANGELOG

**v1.1** (implementación bootstrap/auth):
- Usuario.passwordHash: añadido para autenticación (bcrypt). Requerido para login.
- Pago.referenciaExterna: anotación explícita para idempotencia de pagos online.

**Nota RequisitoTipo/EstadoRequisito/HistorialRequisito:** Cada junta puede tener varios requisitos (agua, basura, etc.). EstadoRequisito tiene PK compuesta (usuarioId, requisitoTipoId). HistorialRequisito registra cada cambio de estado u obligación. Referencia: `flujoRequisitosAdicionales.md`.

---

Importante

Este diseño:

✔ Permite SaaS futuro
✔ Permite auditoría formal
✔ Soporta múltiples roles
✔ Soporta tarifas históricas
✔ Soporta consecutivo legal anual
✔ No guarda deuda
✔ No rompe ninguna regla que definiste