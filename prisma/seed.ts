import { PrismaClient, UserRole, EventMode, EventStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando base de datos...');

  // ── Admin ──────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@invs.app' },
    update: {},
    create: {
      email: 'admin@invs.app',
      fullName: 'Administrador INVS',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // ── Staff ──────────────────────────────────────────────────────
  const staffPassword = await bcrypt.hash('Staff123!', 12);
  const staff = await prisma.user.upsert({
    where: { email: 'staff@invs.app' },
    update: {},
    create: {
      email: 'staff@invs.app',
      fullName: 'Staff INVS',
      passwordHash: staffPassword,
      role: UserRole.STAFF,
    },
  });
  console.log(`✅ Staff: ${staff.email}`);

  // ── Usuario demo con suscripción ───────────────────────────────
  const userPassword = await bcrypt.hash('Demo123!', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@invs.app' },
    update: {},
    create: {
      email: 'demo@invs.app',
      fullName: 'Usuario Demo',
      passwordHash: userPassword,
      role: UserRole.USER,
    },
  });

  await prisma.subscription.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      planName: 'premium',
      status: 'ACTIVE',
      platform: 'manual',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
    },
  });
  console.log(`✅ Demo user: ${demoUser.email} (con suscripción premium)`);

  // ── Eventos de ejemplo ─────────────────────────────────────────
  const evento1 = await prisma.event.upsert({
    where: { id: 'evt-seed-001' },
    update: {},
    create: {
      id: 'evt-seed-001',
      title: 'INVS Live Session #1',
      description: 'Evento musical en vivo con acceso presencial y transmisión online.',
      date: new Date('2026-07-20T21:00:00-03:00'),
      location: 'INVS Studio, Buenos Aires',
      mode: EventMode.HIBRIDO,
      status: EventStatus.PUBLISHED,
      maxCapacity: 100,
    },
  });

  const evento2 = await prisma.event.upsert({
    where: { id: 'evt-seed-002' },
    update: {},
    create: {
      id: 'evt-seed-002',
      title: 'Masterclass Producción Musical',
      description: 'Clase exclusiva para suscriptores INVS.',
      date: new Date('2026-08-05T19:30:00-03:00'),
      location: 'Online',
      mode: EventMode.STREAMING,
      status: EventStatus.PUBLISHED,
    },
  });

  const evento3 = await prisma.event.upsert({
    where: { id: 'evt-seed-003' },
    update: {},
    create: {
      id: 'evt-seed-003',
      title: 'Show Privado INVS',
      description: 'Evento presencial con ingreso validado por QR.',
      date: new Date('2026-08-15T22:00:00-03:00'),
      location: 'INVS Studio',
      mode: EventMode.PRESENCIAL,
      status: EventStatus.PUBLISHED,
      maxCapacity: 50,
    },
  });

  console.log(`✅ Eventos creados: ${evento1.title}, ${evento2.title}, ${evento3.title}`);

  // ── Carousel Photos ─────────────────────────────────────────────
  const photo1 = await prisma.carouselPhoto.upsert({
    where: { id: 'carousel-seed-001' },
    update: {},
    create: {
      id: 'carousel-seed-001',
      imageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1000',
      title: 'Próxima Live Session',
      linkUrl: '/eventos/evt-seed-001',
      sortOrder: 1,
      isActive: true,
    },
  });

  const photo2 = await prisma.carouselPhoto.upsert({
    where: { id: 'carousel-seed-002' },
    update: {},
    create: {
      id: 'carousel-seed-002',
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000',
      title: 'Masterclass de Mezcla y Masterización',
      linkUrl: '/eventos/evt-seed-002',
      sortOrder: 2,
      isActive: true,
    },
  });
  console.log(`✅ Fotos de carrusel creadas: ${photo1.title}, ${photo2.title}`);


  console.log('\n✨ Seed completado!');
  console.log('\n📋 Credenciales de prueba:');
  console.log('  Admin:  admin@invs.app / Admin123!');
  console.log('  Staff:  staff@invs.app / Staff123!');
  console.log('  Demo:   demo@invs.app  / Demo123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
