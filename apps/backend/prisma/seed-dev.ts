/**
 * Seed de desarrollo – Credenciales conocidas para pruebas.
 * Solo para desarrollo local. NUNCA usar en producción.
 *
 * Credenciales creadas:
 * - Platform Admin: CC 00000000 / DevPlatform123!
 * - Admin Junta: CC 12345678 / DevAdmin123!
 *
 * Uso: npm run db:seed  (desde apps/backend)
 */
import { PrismaClient, RolNombre } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

async function main() {
  const juntaCount = await prisma.junta.count();
  if (juntaCount > 0) {
    console.log('Ya existen juntas. Seed omitido. Credenciales de desarrollo:');
    console.log('  Platform Admin:', PLATFORM_ADMIN.numeroDocumento, '/', PLATFORM_ADMIN.password);
    console.log('  Admin Junta:  ', JUNTA_ADMIN.numeroDocumento, '/', JUNTA_ADMIN.password);
    return;
  }

  // Asegurar roles
  const roles = [
    RolNombre.PLATFORM_ADMIN,
    RolNombre.ADMIN,
    RolNombre.SECRETARIA,
    RolNombre.TESORERA,
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
    },
  });

  await prisma.usuarioRol.create({
    data: { usuarioId: platformAdmin.id, rolId: rolPlatform.id },
  });

  // Primera Junta
  const junta = await prisma.junta.create({
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

  const juntaAdmin = await prisma.usuario.create({
    data: {
      juntaId: junta.id,
      tipoDocumento: JUNTA_ADMIN.tipoDocumento,
      numeroDocumento: JUNTA_ADMIN.numeroDocumento,
      nombres: JUNTA_ADMIN.nombres,
      apellidos: JUNTA_ADMIN.apellidos,
      telefono: JUNTA_ADMIN.telefono,
      direccion: JUNTA_ADMIN.direccion,
      passwordHash: adminHash,
    },
  });

  const rolCiudadano = await prisma.rol.findUniqueOrThrow({
    where: { nombre: RolNombre.AFILIADO },
  });

  await prisma.usuarioRol.createMany({
    data: [
      { usuarioId: juntaAdmin.id, rolId: rolAdmin.id },
      { usuarioId: juntaAdmin.id, rolId: rolCiudadano.id },
    ],
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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
