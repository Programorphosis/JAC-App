/**
 * Seed de desarrollo – Credenciales conocidas + datos de demo.
 * Solo para desarrollo local. NUNCA usar en producción.
 *
 * Estructura de la junta demo:
 * - Sin requisitos adicionales (agua, aseo, etc.)
 * - Con tarifas (TRABAJANDO / NO_TRABAJANDO)
 * - Usuarios con distintos estados para probar flujos:
 *   1. María (1001001), Carlos (1001002): Cartas APROBADA listas para descargar (PDF + QR)
 *   2. Ana (1001003): Pago carta al día, listo para solicitar (no para descargar)
 *   3. Pedro (1001004), Laura (1001005), Roberto (1001006): Sin nada al día → probar pagos, PDF, QR
 *   4. Secretaria (1001014), Tesorera (1001015): roles administrativos
 *
 * Credenciales (contraseña = número de documento):
 * - Platform Admin: CC 00000000 / 00000000
 * - Admin Junta: CC 12345678 / 12345678
 * - Afiliados: CC + doc / doc (ej. 1001001 / 1001001)
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
  /** Contraseña = número de documento */
};

const JUNTA_ADMIN = {
  tipoDocumento: 'CC',
  numeroDocumento: '12345678',
  nombres: 'Juan',
  apellidos: 'Pérez',
  telefono: '3001234567',
  direccion: 'Calle 10 #5-20',
  /** Contraseña = número de documento */
};

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

  // Platform Admin (contraseña = número de documento)
  const platformHash = await bcrypt.hash(PLATFORM_ADMIN.numeroDocumento, 10);
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
      email: 'junta.barrio.centro@demo.local',
      telefono: '+573001234567',
      nit: '900123456',
      montoCarta: 5000,
    },
  });

  // Admin de la junta (contraseña = número de documento)
  const adminHash = await bcrypt.hash(JUNTA_ADMIN.numeroDocumento, 10);
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
      requiereCambioPassword: true,
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

  console.log('');
  console.log('=== Seed de desarrollo completado ===');
  console.log('');
  console.log('Credenciales (contraseña = número de documento):');
  console.log('');
  console.log('  Platform Admin (juntaId: platform):');
  console.log('    Documento:', PLATFORM_ADMIN.numeroDocumento);
  console.log('    Password: ', PLATFORM_ADMIN.numeroDocumento);
  console.log('');
  console.log('  Admin Junta (primera junta):');
  console.log('    Documento:', JUNTA_ADMIN.numeroDocumento);
  console.log('    Password: ', JUNTA_ADMIN.numeroDocumento);
  console.log('  Afiliados: documento = password');
  console.log('');
  console.log('  Demo flujos:');
  console.log('    María (1001001), Carlos (1001002): Carta lista para descargar + QR');
  console.log('    Ana (1001003): Listo para solicitar carta');
  console.log('    Pedro (1001004), Laura (1001005), Roberto (1001006): Con deuda → probar pagos');
  console.log('');
}

async function agregarDatosDemo(
  prisma: PrismaClient,
  juntaId: string,
  montoCarta: number,
  adminId: string,
) {
  const anio = new Date().getFullYear();
  const rolAfiliado = await prisma.rol.findUniqueOrThrow({ where: { nombre: RolNombre.AFILIADO } });
  const rolSecretaria = await prisma.rol.findUniqueOrThrow({ where: { nombre: RolNombre.SECRETARIA } });
  const rolTesorera = await prisma.rol.findUniqueOrThrow({ where: { nombre: RolNombre.TESORERA } });

  const AFILIADOS_SEED = [
    { nombres: 'María', apellidos: 'García López', doc: '1001001' },
    { nombres: 'Carlos', apellidos: 'Rodríguez Sánchez', doc: '1001002' },
    { nombres: 'Ana', apellidos: 'Martínez Díaz', doc: '1001003' },
    { nombres: 'Pedro', apellidos: 'López Hernández', doc: '1001004' },
    { nombres: 'Laura', apellidos: 'González Pérez', doc: '1001005' },
    { nombres: 'Roberto', apellidos: 'Fernández Ruiz', doc: '1001006' },
    { nombres: 'Secretaria', apellidos: 'Gómez', doc: '1001014' },
    { nombres: 'Tesorera', apellidos: 'López', doc: '1001015' },
  ];

  const usuariosCreados: { id: string; doc: string }[] = [];

  for (let i = 0; i < AFILIADOS_SEED.length; i++) {
    const a = AFILIADOS_SEED[i];
    const passwordHash = await bcrypt.hash(a.doc, 10);
    const u = await prisma.usuario.create({
      data: {
        juntaId,
        tipoDocumento: 'CC',
        numeroDocumento: a.doc,
        nombres: a.nombres,
        apellidos: a.apellidos,
        passwordHash,
        requiereCambioPassword: true,
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
    usuariosCreados.push({ id: u.id, doc: a.doc });
  }

  const fechaBase = new Date(2024, 0, 1);
  await Promise.all(
    usuariosCreados.map((u, idx) =>
      prisma.historialLaboral.create({
        data: {
          usuarioId: u.id,
          estado: idx % 2 === 0 ? EstadoLaboralTipo.TRABAJANDO : EstadoLaboralTipo.NO_TRABAJANDO,
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

  await prisma.consecutivo.upsert({
    where: { juntaId_tipo_anio: { juntaId, tipo: 'PAGO_JUNTA', anio } },
    create: { juntaId, tipo: 'PAGO_JUNTA', anio, valorActual: 10 },
    update: {},
  });
  await prisma.consecutivo.upsert({
    where: { juntaId_tipo_anio: { juntaId, tipo: 'PAGO_CARTA', anio } },
    create: { juntaId, tipo: 'PAGO_CARTA', anio, valorActual: 5 },
    update: {},
  });
  await prisma.consecutivo.upsert({
    where: { juntaId_tipo_anio: { juntaId, tipo: 'CARTA', anio } },
    create: { juntaId, tipo: 'CARTA', anio, valorActual: 2 },
    update: {},
  });

  const secretaria = usuariosCreados.find((u) => u.doc === '1001014');
  const tesorera = usuariosCreados.find((u) => u.doc === '1001015');
  const registrador = tesorera?.id ?? adminId;

  let consecJunta = 1;
  let consecCarta = 1;

  const maria = usuariosCreados.find((u) => u.doc === '1001001')!;
  const carlos = usuariosCreados.find((u) => u.doc === '1001002')!;
  const ana = usuariosCreados.find((u) => u.doc === '1001003')!;

  for (const u of [maria, carlos]) {
    for (let m = 0; m < 6; m++) {
      await prisma.pago.create({
        data: {
          juntaId,
          usuarioId: u.id,
          tipo: TipoPago.JUNTA,
          metodo: MetodoPago.EFECTIVO,
          monto: u === maria ? 15000 : 8000,
          consecutivo: consecJunta++,
          registradoPorId: registrador,
          vigencia: null,
        },
      });
    }
    await prisma.pago.create({
      data: {
        juntaId,
        usuarioId: u.id,
        tipo: TipoPago.CARTA,
        metodo: MetodoPago.EFECTIVO,
        monto: montoCarta,
        consecutivo: consecCarta++,
        registradoPorId: registrador,
        vigencia: false,
      },
    });
  }

  for (let m = 0; m < 6; m++) {
    await prisma.pago.create({
      data: {
        juntaId,
        usuarioId: ana.id,
        tipo: TipoPago.JUNTA,
        metodo: MetodoPago.EFECTIVO,
        monto: 15000,
        consecutivo: consecJunta++,
        registradoPorId: registrador,
        vigencia: null,
      },
    });
  }
  await prisma.pago.create({
    data: {
      juntaId,
      usuarioId: ana.id,
      tipo: TipoPago.CARTA,
      metodo: MetodoPago.EFECTIVO,
      monto: montoCarta,
      consecutivo: consecCarta++,
      registradoPorId: registrador,
      vigencia: true,
    },
  });

  const sinNada = usuariosCreados.filter((u) =>
    ['1001004', '1001005', '1001006'].includes(u.doc),
  );
  for (const u of sinNada) {
    await prisma.pago.create({
      data: {
        juntaId,
        usuarioId: u.id,
        tipo: TipoPago.JUNTA,
        metodo: MetodoPago.EFECTIVO,
        monto: 8000,
        consecutivo: consecJunta++,
        registradoPorId: registrador,
        vigencia: null,
      },
    });
  }

  const vigenciaCarta = new Date();
  vigenciaCarta.setMonth(vigenciaCarta.getMonth() + 3);
  for (let i = 0; i < 2; i++) {
    const u = i === 0 ? maria : carlos;
    const consec = i + 1;
    const qrToken = randomUUID();
    await prisma.carta.create({
      data: {
        juntaId,
        usuarioId: u.id,
        consecutivo: consec,
        anio,
        estado: EstadoCartaTipo.APROBADA,
        qrToken,
        fechaSolicitud: new Date(anio, 0, 10 + i),
        fechaEmision: new Date(anio, 0, 15 + i),
        vigenciaHasta: vigenciaCarta,
        emitidaPorId: secretaria?.id ?? adminId,
        rutaPdf: `cartas/${juntaId}/${u.id}/${anio}-${consec}.pdf`,
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
