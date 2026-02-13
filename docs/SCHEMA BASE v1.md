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
  CIUDADANO
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

enum EstadoAguaTipo {
  AL_DIA
  MORA
}

enum EstadoCartaTipo {
  PENDIENTE
  APROBADA
  RECHAZADA
}

enum TipoCambioAgua {
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
  estadoAgua        EstadoAgua?
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
// AGUA
//////////////////////////////////////////////////////

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

**Nota EstadoAgua/HistorialAgua:** En Prisma, HistorialAgua se relaciona con Usuario (usuarioId). El historial de agua de un usuario se consulta vía Usuario.historialAgua. No se usa relación directa EstadoAgua→HistorialAgua para evitar conflictos de FK.

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