import {
  FieldType,
  PrismaClient,
  StadiumStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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

async function seedUsers() {
  for (const user of sampleUsers) {
    const passwordHash = await bcrypt.hash(user.password, 12);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        status: user.status,
        isOwnerVerified: user.isOwnerVerified,
      },
      create: {
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

async function seedStadiumsAndFields() {
  for (const stadiumTemplate of stadiumTemplates) {
    const owner = await prisma.user.findUnique({
      where: { email: stadiumTemplate.ownerEmail },
    });

    if (!owner) {
      throw new Error(
        `Owner not found for stadium ${stadiumTemplate.name}: ${stadiumTemplate.ownerEmail}`,
      );
    }

    const existingStadium = await prisma.stadium.findFirst({
      where: {
        ownerId: owner.id,
        name: stadiumTemplate.name,
      },
      select: { id: true },
    });

    const stadium = await prisma.stadium.upsert({
      where: { id: existingStadium?.id ?? '00000000-0000-0000-0000-000000000000' },
      update: {
        description: stadiumTemplate.description,
        address: stadiumTemplate.address,
        latitude: stadiumTemplate.latitude,
        longitude: stadiumTemplate.longitude,
        phone: stadiumTemplate.phone,
        status: StadiumStatus.ACTIVE,
      },
      create: {
        ownerId: owner.id,
        name: stadiumTemplate.name,
        description: stadiumTemplate.description,
        address: stadiumTemplate.address,
        latitude: stadiumTemplate.latitude,
        longitude: stadiumTemplate.longitude,
        phone: stadiumTemplate.phone,
        status: StadiumStatus.ACTIVE,
      },
    });

    for (const fieldTemplate of fieldTemplates) {
      const existingField = await prisma.field.findFirst({
        where: {
          stadiumId: stadium.id,
          name: fieldTemplate.name,
        },
        select: { id: true },
      });

      const field = await prisma.field.upsert({
        where: { id: existingField?.id ?? '00000000-0000-0000-0000-000000000000' },
        update: {
          fieldType: fieldTemplate.fieldType,
          capacity: fieldTemplate.capacity,
          size: fieldTemplate.size,
          pricePerHour: fieldTemplate.pricePerHour,
          weekendMultiplier: fieldTemplate.weekendMultiplier,
          peakMultiplier: fieldTemplate.peakMultiplier,
          description: fieldTemplate.description,
          isActive: true,
        },
        create: {
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
      });

      for (const schedule of dayPatterns) {
        await prisma.workingHour.upsert({
          where: {
            fieldId_dayOfWeek: {
              fieldId: field.id,
              dayOfWeek: schedule.dayOfWeek,
            },
          },
          update: {
            openTime: schedule.openTime,
            closeTime: schedule.closeTime,
            isClosed: false,
          },
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

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Seed script is forbidden in production. Use only a local development/test database.',
    );
  }

  await seedUsers();
  await seedStadiumsAndFields();

  const userCount = await prisma.user.count();
  const stadiumCount = await prisma.stadium.count();
  const fieldCount = await prisma.field.count();

  console.log(
    `Seed complete. Users: ${userCount}, Stadiums: ${stadiumCount}, Fields: ${fieldCount}`,
  );
  console.log(
    'Demo credentials: admin@stadium.local / Admin123!, owner1@stadium.local / Owner123!, user1@stadium.local / User123!',
  );
}

main()
  .catch((error) => {
    console.error('Seed failed');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
