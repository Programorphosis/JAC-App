/**
 * Seed de desarrollo – Credenciales conocidas + datos de demo.
 * Solo para desarrollo local. NUNCA usar en producción.
 *
 * Credenciales creadas:
 * - Platform Admin: CC 00000000 / DevPlatform123!
 * - Admin Junta: CC 12345678 / DevAdmin123!
 *
 * Datos de demo (si no existen): 15 afiliados, tarifas, pagos, cartas, requisitos.
 *
 * Uso: npm run db:seed  (desde apps/backend)
 */
import { PrismaClient, RolNombre, EstadoLaboralTipo, MetodoPago, TipoPago, EstadoCartaTipo } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const PLATFORM_ADMIN = {
  tipoDocumento: 'CC',
  numeroDocumento: '00000000',
  nombres: 'Admin',
  apellidos: 'Plataforma',
  password: 'DevPlatform123!',
};

const JUNTA_ADMIN = {
  tipoDocumento: 'CC',
  numeroDocumento: '12345678',
  nombres: 'Juan',
  apellidos: 'Pérez',
  password: 'DevAdmin123!',
  telefono: '3001234567',
  direccion: 'Calle 10 #5-20',
};

/** Afiliados de demo para poblar la junta */
const AFILIADOS_DEMO = [
  { nombres: 'María', apellidos: 'García López', doc: '1001001' },
  { nombres: 'Carlos', apellidos: 'Rodríguez Sánchez', doc: '1001002' },
  { nombres: 'Ana', apellidos: 'Martínez Díaz', doc: '1001003' },
  { nombres: 'Pedro', apellidos: 'López Hernández', doc: '1001004' },
  { nombres: 'Laura', apellidos: 'González Pérez', doc: '1001005' },
  { nombres: 'Roberto', apellidos: 'Fernández Ruiz', doc: '1001006' },
  { nombres: 'Sandra', apellidos: 'Torres Vega', doc: '1001007' },
  { nombres: 'Miguel', apellidos: 'Ramírez Castro', doc: '1001008' },
  { nombres: 'Carmen', apellidos: 'Flores Morales', doc: '1001009' },
  { nombres: 'Jorge', apellidos: 'Silva Rojas', doc: '1001010' },
  { nombres: 'Patricia', apellidos: 'Mendoza Ortiz', doc: '1001011' },
  { nombres: 'Ricardo', apellidos: 'Vargas Guzmán', doc: '1001012' },
  { nombres: 'Elena', apellidos: 'Castro Herrera', doc: '1001013' },
  { nombres: 'Secretaria', apellidos: 'Gómez', doc: '1001014' },
  { nombres: 'Tesorera', apellidos: 'López', doc: '1001015' },
];

async function main() {
  const juntaCount = await prisma.junta.count();
  let junta: { id: string; montoCarta: number | null };
  let juntaAdmin: { id: string };

  if (juntaCount === 0) {

  // Asegurar roles
  const roles = [
    RolNombre.PLATFORM_ADMIN,
    RolNombre.ADMIN,
    RolNombre.SECRETARIA,
    RolNombre.TESORERA,
    RolNombre.FISCAL,
    RolNombre.RECEPTOR_AGUA,
    RolNombre.AFILIADO,
  ];

  for (const nombre of roles) {
    await prisma.rol.upsert({
      where: { nombre },
      create: { nombre },
      update: {},
    });
  }

  // Platform Admin
  const platformHash = await bcrypt.hash(PLATFORM_ADMIN.password, 10);
  const rolPlatform = await prisma.rol.findUniqueOrThrow({
    where: { nombre: RolNombre.PLATFORM_ADMIN },
  });

  const platformAdmin = await prisma.usuario.create({
    data: {
      juntaId: null,
      tipoDocumento: PLATFORM_ADMIN.tipoDocumento,
      numeroDocumento: PLATFORM_ADMIN.numeroDocumento,
      nombres: PLATFORM_ADMIN.nombres,
      apellidos: PLATFORM_ADMIN.apellidos,
      passwordHash: platformHash,
      requiereCambioPassword: false,
    },
  });

  await prisma.usuarioRol.create({
    data: { usuarioId: platformAdmin.id, rolId: rolPlatform.id },
  });

  // Primera Junta
  const juntaCreada = await prisma.junta.create({
    data: {
      nombre: 'Junta Barrio Centro (Dev)',
      nit: '900123456',
      montoCarta: 5000,
    },
  });

  // Admin de la junta
  const adminHash = await bcrypt.hash(JUNTA_ADMIN.password, 10);
  const rolAdmin = await prisma.rol.findUniqueOrThrow({
    where: { nombre: RolNombre.ADMIN },
  });

  const adminCreado = await prisma.usuario.create({
    data: {
      juntaId: juntaCreada.id,
      tipoDocumento: JUNTA_ADMIN.tipoDocumento,
      numeroDocumento: JUNTA_ADMIN.numeroDocumento,
      nombres: JUNTA_ADMIN.nombres,
      apellidos: JUNTA_ADMIN.apellidos,
      telefono: JUNTA_ADMIN.telefono,
      direccion: JUNTA_ADMIN.direccion,
      passwordHash: adminHash,
      requiereCambioPassword: false,
    },
  });

  const rolAfiliado = await prisma.rol.findUniqueOrThrow({
    where: { nombre: RolNombre.AFILIADO },
  });

  await prisma.usuarioRol.createMany({
    data: [
      { usuarioId: adminCreado.id, rolId: rolAdmin.id },
      { usuarioId: adminCreado.id, rolId: rolAfiliado.id },
    ],
  });

    junta = { id: juntaCreada.id, montoCarta: juntaCreada.montoCarta };
    juntaAdmin = { id: adminCreado.id };
  } else {
    const primera = await prisma.junta.findFirst({ orderBy: { fechaCreacion: 'asc' } });
    if (!primera) return;
    junta = { id: primera.id, montoCarta: primera.montoCarta };
    const admin = await prisma.usuario.findFirst({
      where: { juntaId: primera.id },
      select: { id: true },
    });
    if (!admin) return;
    juntaAdmin = { id: admin.id };
  }

  // Añadir datos de demo si la junta tiene pocos usuarios
  const usuariosCount = await prisma.usuario.count({ where: { juntaId: junta.id } });
  if (usuariosCount < 5) {
    await agregarDatosDemo(prisma, junta.id, junta.montoCarta ?? 5000, juntaAdmin.id);
    console.log('Datos de demo agregados a la junta.');
  }

  // Asegurar que usuarios de demo no requieran cambio de contraseña (BD existentes)
  await prisma.usuario.updateMany({
    where: {
      OR: [
        { numeroDocumento: PLATFORM_ADMIN.numeroDocumento, juntaId: null },
        { numeroDocumento: JUNTA_ADMIN.numeroDocumento },
      ],
    },
    data: { requiereCambioPassword: false },
  });

  console.log('');
  console.log('=== Seed de desarrollo completado ===');
  console.log('');
  console.log('Credenciales para Postman:');
  console.log('');
  console.log('  Platform Admin (juntaId: platform):');
  console.log('    Documento:', PLATFORM_ADMIN.numeroDocumento);
  console.log('    Password: ', PLATFORM_ADMIN.password);
  console.log('');
  console.log('  Admin Junta (primera junta):');
  console.log('    Documento:', JUNTA_ADMIN.numeroDocumento);
  console.log('    Password: ', JUNTA_ADMIN.password);
  console.log('');
}

async function agregarDatosDemo(
  prisma: PrismaClient,
  juntaId: string,
  montoCarta: number,
  adminId: string,
) {
  const anio = new Date().getFullYear();
  const passwordHash = await bcrypt.hash('Demo123!', 10);
  const rolAfiliado = await prisma.rol.findUniqueOrThrow({ where: { nombre: RolNombre.AFILIADO } });
  const rolSecretaria = await prisma.rol.findUniqueOrThrow({ where: { nombre: RolNombre.SECRETARIA } });
  const rolTesorera = await prisma.rol.findUniqueOrThrow({ where: { nombre: RolNombre.TESORERA } });
  const rolReceptorAgua = await prisma.rol.findUniqueOrThrow({ where: { nombre: RolNombre.RECEPTOR_AGUA } });

  const usuariosCreados: { id: string; doc: string }[] = [];

  for (let i = 0; i < AFILIADOS_DEMO.length; i++) {
    const a = AFILIADOS_DEMO[i];
    const u = await prisma.usuario.create({
      data: {
        juntaId,
        tipoDocumento: 'CC',
        numeroDocumento: a.doc,
        nombres: a.nombres,
        apellidos: a.apellidos,
        passwordHash,
        requiereCambioPassword: false,
        fechaAfiliacion: new Date(2024, 0, 1 + i),
        folio: 1,
        numeral: i + 1,
        lugarExpedicion: 'Bogotá, Cundinamarca',
      },
    });
    await prisma.usuarioRol.create({ data: { usuarioId: u.id, rolId: rolAfiliado.id } });
    if (a.nombres === 'Secretaria') {
      await prisma.usuarioRol.create({ data: { usuarioId: u.id, rolId: rolSecretaria.id } });
    }
    if (a.nombres === 'Tesorera') {
      await prisma.usuarioRol.create({ data: { usuarioId: u.id, rolId: rolTesorera.id } });
    }
    if (a.nombres === 'Ana') {
      await prisma.usuarioRol.create({ data: { usuarioId: u.id, rolId: rolReceptorAgua.id } });
    }
    usuariosCreados.push({ id: u.id, doc: a.doc });
  }

  const fechaBase = new Date(2024, 0, 1);
  await Promise.all(
    usuariosCreados.map((u, idx) =>
      prisma.historialLaboral.create({
        data: {
          usuarioId: u.id,
          estado: idx % 3 === 0 ? EstadoLaboralTipo.TRABAJANDO : EstadoLaboralTipo.NO_TRABAJANDO,
          fechaInicio: fechaBase,
          creadoPorId: adminId,
        },
      }),
    ),
  );

  const vigenciaTarifa = new Date(2024, 0, 1);
  await prisma.tarifa.createMany({
    data: [
      { juntaId, estadoLaboral: EstadoLaboralTipo.TRABAJANDO, valorMensual: 15000, fechaVigencia: vigenciaTarifa },
      { juntaId, estadoLaboral: EstadoLaboralTipo.NO_TRABAJANDO, valorMensual: 8000, fechaVigencia: vigenciaTarifa },
    ],
  });

  const receptorAgua = usuariosCreados[2];
  await prisma.requisitoTipo.createMany({
    data: [
      { juntaId, nombre: 'Servicio de agua', modificadorId: receptorAgua.id, tieneCorteAutomatico: true },
      { juntaId, nombre: 'Aseo', tieneCorteAutomatico: false },
    ],
  });
  const requisitos = await prisma.requisitoTipo.findMany({ where: { juntaId } });

  const numPagosJunta = 12;
  const numPagosCarta = 5;
  const numCartas = 3;
  await prisma.consecutivo.upsert({
    where: { juntaId_tipo_anio: { juntaId, tipo: 'PAGO_JUNTA', anio } },
    create: { juntaId, tipo: 'PAGO_JUNTA', anio, valorActual: numPagosJunta },
    update: {},
  });
  await prisma.consecutivo.upsert({
    where: { juntaId_tipo_anio: { juntaId, tipo: 'PAGO_CARTA', anio } },
    create: { juntaId, tipo: 'PAGO_CARTA', anio, valorActual: numPagosCarta },
    update: {},
  });
  await prisma.consecutivo.upsert({
    where: { juntaId_tipo_anio: { juntaId, tipo: 'CARTA', anio } },
    create: { juntaId, tipo: 'CARTA', anio, valorActual: numCartas },
    update: {},
  });

  let consecJunta = 1;
  let consecCarta = 1;
  const secretaria = usuariosCreados.find((u) => u.doc === '1001014');
  const tesorera = usuariosCreados.find((u) => u.doc === '1001015');
  const registrador = tesorera?.id ?? adminId;

  for (let i = 0; i < Math.min(12, usuariosCreados.length); i++) {
    const u = usuariosCreados[i];
    await prisma.pago.create({
      data: {
        juntaId,
        usuarioId: u.id,
        tipo: TipoPago.JUNTA,
        metodo: MetodoPago.EFECTIVO,
        monto: i % 3 === 0 ? 15000 : 8000,
        consecutivo: consecJunta++,
        registradoPorId: registrador,
        vigencia: null,
      },
    });
  }

  for (let i = 0; i < 5; i++) {
    const u = usuariosCreados[i];
    await prisma.pago.create({
      data: {
        juntaId,
        usuarioId: u.id,
        tipo: TipoPago.CARTA,
        metodo: MetodoPago.EFECTIVO,
        monto: montoCarta,
        consecutivo: consecCarta++,
        registradoPorId: registrador,
        vigencia: i < 3,
      },
    });
  }

  for (const r of requisitos) {
    for (let i = 0; i < usuariosCreados.length; i++) {
      await prisma.estadoRequisito.upsert({
        where: {
          usuarioId_requisitoTipoId: { usuarioId: usuariosCreados[i].id, requisitoTipoId: r.id },
        },
        create: {
          usuarioId: usuariosCreados[i].id,
          requisitoTipoId: r.id,
          estado: i % 5 === 0 ? 'MORA' : 'AL_DIA',
          obligacionActiva: true,
        },
        update: {},
      });
    }
  }

  const vigenciaCarta = new Date();
  vigenciaCarta.setMonth(vigenciaCarta.getMonth() + 3);
  for (let i = 0; i < 3; i++) {
    const u = usuariosCreados[i];
    await prisma.carta.create({
      data: {
        juntaId,
        usuarioId: u.id,
        consecutivo: i + 1,
        anio,
        estado: EstadoCartaTipo.APROBADA,
        qrToken: randomUUID(),
        fechaSolicitud: new Date(2025, 0, 10 + i),
        fechaEmision: new Date(2025, 0, 15 + i),
        vigenciaHasta: vigenciaCarta,
        emitidaPorId: secretaria?.id ?? adminId,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
