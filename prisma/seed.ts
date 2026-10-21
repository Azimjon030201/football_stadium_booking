import {
  FieldType,
  PrismaClient,
  StadiumStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

let prisma: PrismaClient;

const sampleUsers = [
  {
    email: 'admin@stadium.local',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'User',
    phone: '+998900000001',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    isOwnerVerified: true,
  },
  {
    email: 'owner1@stadium.local',
    password: 'Owner123!',
    firstName: 'Botir',
    lastName: 'Karimov',
    phone: '+998901000001',
    role: UserRole.OWNER,
    status: UserStatus.ACTIVE,
    isOwnerVerified: true,
  },
  {
    email: 'owner2@stadium.local',
    password: 'Owner123!',
    firstName: 'Dilshod',
    lastName: 'Suyunov',
    phone: '+998901000002',
    role: UserRole.OWNER,
    status: UserStatus.ACTIVE,
    isOwnerVerified: true,
  },
  {
    email: 'user1@stadium.local',
    password: 'User123!',
    firstName: 'Ali',
    lastName: 'Rahimov',
    phone: '+998902000001',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    isOwnerVerified: false,
  },
  {
    email: 'user2@stadium.local',
    password: 'User123!',
    firstName: 'Javohir',
    lastName: 'Mustafoyev',
    phone: '+998902000002',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    isOwnerVerified: false,
  },
  {
    email: 'user3@stadium.local',
    password: 'User123!',
    firstName: 'Sardor',
    lastName: 'Nematov',
    phone: '+998902000003',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    isOwnerVerified: false,
  },
] as const;

const stadiumTemplates = [
  {
    ownerEmail: 'owner1@stadium.local',
    name: 'Tashkent Arena',
    description: 'Markaziy joylashgan yengil futbol stadioni',
    address: 'Tashkent, Yunusobod kochasi 12',
    latitude: 41.333333,
    longitude: 69.279999,
    phone: '+998711000001',
  },
  {
    ownerEmail: 'owner1@stadium.local',
    name: 'Green Valley Stadium',
    description: 'Tabiatga yaqin, zamonaviy maydonlar',
    address: 'Tashkent, Qibray kochasi 24',
    latitude: 41.269444,
    longitude: 69.220833,
    phone: '+998711000002',
  },
  {
    ownerEmail: 'owner2@stadium.local',
    name: 'Olympic Mini Pitch',
    description: 'Mini futbol va trening uchun mo\'ljallangan',
    address: 'Samarkand, Registon kochasi 7',
    latitude: 39.6542,
    longitude: 66.9597,
    phone: '+998711000003',
  },
] as const;

const fieldTemplates = [
  {
    name: 'Main Field',
    fieldType: FieldType.OUTDOOR,
    capacity: 8,
    size: '50x30m',
    pricePerHour: '150000',
    weekendMultiplier: 1.3,
    peakMultiplier: 1.5,
    description: 'Asosiy futbol maydoni',
  },
  {
    name: 'Training Field',
    fieldType: FieldType.NATURAL_GRASS,
    capacity: 6,
    size: '35x22m',
    pricePerHour: '110000',
    weekendMultiplier: 1.2,
    peakMultiplier: 1.3,
    description: "Mashg'ulotlar uchun kichik maydon",
  },
] as const;

const dayPatterns = [
  { dayOfWeek: 0, openTime: '09:00', closeTime: '21:00' },
  { dayOfWeek: 1, openTime: '08:00', closeTime: '22:00' },
  { dayOfWeek: 2, openTime: '08:00', closeTime: '22:00' },
  { dayOfWeek: 3, openTime: '08:00', closeTime: '22:00' },
  { dayOfWeek: 4, openTime: '08:00', closeTime: '22:00' },
  { dayOfWeek: 5, openTime: '09:00', closeTime: '23:00' },
  { dayOfWeek: 6, openTime: '09:00', closeTime: '23:00' },
] as const;

/**
 * Load .env for direct `npm run seed` execution too.
 * Existing shell variables take precedence over values in .env.
 */
function loadDotEnv(): void {
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function assertSafeDatabaseTarget(): void {
  if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
    throw new Error(
      'Seed production muhitida taqiqlangan. Faqat development/test database ishlating.',
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL topilmadi. Loyiha ildizidagi .env faylini tekshiring.');
  }

  let hostname: string;
  try {
    hostname = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error('DATABASE_URL noto‘g‘ri formatda.');
  }

  const localHosts = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
    'postgres',
    'host.docker.internal',
  ]);

  if (!localHosts.has(hostname) && process.env.ALLOW_NON_LOCAL_DB !== 'true') {
    throw new Error(
      `Seed xavfsizlik sabab to‘xtatildi: DATABASE_URL host "${hostname}" local emas. ` +
      'Faqat aniq tasdiqlangan development/test database uchun ALLOW_NON_LOCAL_DB=true ni ongli ravishda sozlang.',
    );
  }
}

async function seedUsers(): Promise<void> {
  for (const user of sampleUsers) {
    // Hash only when the demo account must be created. Existing accounts are not changed.
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    });
    if (existing) continue;

    const passwordHash = await bcrypt.hash(user.password, 12);
    await prisma.user.create({
      data: {
        email: user.email,
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        status: user.status,
        isOwnerVerified: user.isOwnerVerified,
      },
    });
  }
}

async function seedStadiumsAndFields(): Promise<void> {
  for (const stadiumTemplate of stadiumTemplates) {
    const owner = await prisma.user.findUnique({
      where: { email: stadiumTemplate.ownerEmail },
      select: { id: true },
    });

    if (!owner) {
      throw new Error(
        `Owner topilmadi: ${stadiumTemplate.ownerEmail}. Avval seedUsers bajarilishi kerak.`,
      );
    }

    // Stadium has no schema-level unique key for (ownerId, name), so use a
    // sequential find-then-create rather than inventing a fake UUID for upsert.
    let stadium = await prisma.stadium.findFirst({
      where: {
        ownerId: owner.id,
        name: stadiumTemplate.name,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!stadium) {
      stadium = await prisma.stadium.create({
        data: {
          ownerId: owner.id,
          name: stadiumTemplate.name,
          description: stadiumTemplate.description,
          address: stadiumTemplate.address,
          latitude: stadiumTemplate.latitude,
          longitude: stadiumTemplate.longitude,
          phone: stadiumTemplate.phone,
          status: StadiumStatus.ACTIVE,
        },
        select: { id: true },
      });
    }

    for (const fieldTemplate of fieldTemplates) {
      let field = await prisma.field.findFirst({
        where: {
          stadiumId: stadium.id,
          name: fieldTemplate.name,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!field) {
        field = await prisma.field.create({
          data: {
            stadiumId: stadium.id,
            name: fieldTemplate.name,
            fieldType: fieldTemplate.fieldType,
            capacity: fieldTemplate.capacity,
            size: fieldTemplate.size,
            pricePerHour: fieldTemplate.pricePerHour,
            weekendMultiplier: fieldTemplate.weekendMultiplier,
            peakMultiplier: fieldTemplate.peakMultiplier,
            description: fieldTemplate.description,
            isActive: true,
          },
          select: { id: true },
        });
      }

      for (const schedule of dayPatterns) {
        await prisma.workingHour.upsert({
          where: {
            fieldId_dayOfWeek: {
              fieldId: field.id,
              dayOfWeek: schedule.dayOfWeek,
            },
          },
          // Do not overwrite schedules that a developer has already customized.
          update: {},
          create: {
            fieldId: field.id,
            dayOfWeek: schedule.dayOfWeek,
            openTime: schedule.openTime,
            closeTime: schedule.closeTime,
            isClosed: false,
          },
        });
      }
    }
  }
}

async function main(): Promise<void> {
  loadDotEnv();
  assertSafeDatabaseTarget();
  prisma = new PrismaClient();

  await seedUsers();
  await seedStadiumsAndFields();

  const [userCount, stadiumCount, fieldCount, workingHourCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.stadium.count(),
      prisma.field.count(),
      prisma.workingHour.count(),
    ]);

  console.log(
    `Seed yakunlandi. Database jami: Users=${userCount}, Stadiums=${stadiumCount}, Fields=${fieldCount}, WorkingHours=${workingHourCount}`,
  );
  console.log(
    'Demo hisoblar faqat lokal development/test uchun. Login ma’lumotlari README.md dagi "Seed ma’lumotlari" bo‘limida.',
  );
}

main()
  .catch((error: unknown) => {
    console.error('Seed bajarilmadi:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
  });
