import {
  BookingStatus,
  FieldType,
  NotificationType,
  PaymentProviderType,
  PaymentStatus,
  Prisma,
  PrismaClient,
  StadiumStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

let prisma: PrismaClient;

const demoUsers = [
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
    description: 'Markaziy joylashgan zamonaviy futbol va mini-stadion kompleksi.',
    address: 'Toshkent shahri, Yunusobod ko‘chasi 12',
    latitude: 41.333333,
    longitude: 69.279999,
    phone: '+998711000001',
  },
  {
    ownerEmail: 'owner1@stadium.local',
    name: 'Green Valley Stadium',
    description: 'Tabiatga yaqin, trening va amaliy uchrashuvlar uchun mo‘ljallangan maydonlar.',
    address: 'Toshkent shahri, Qibray ko‘chasi 24',
    latitude: 41.269444,
    longitude: 69.220833,
    phone: '+998711000002',
  },
  {
    ownerEmail: 'owner2@stadium.local',
    name: 'Olympic Mini Pitch',
    description: 'Mini futbol, jamoa mashg‘ulotlari va kengashlar uchun qulay baza.',
    address: 'Samarqand shahri, Registon ko‘chasi 7',
    latitude: 39.6542,
    longitude: 66.9597,
    phone: '+998711000003',
  },
] as const;

const fieldTemplates = [
  {
    name: 'Main Pitch',
    fieldType: FieldType.OUTDOOR,
    capacity: 10,
    size: '50x30m',
    pricePerHour: '180000',
    weekendMultiplier: 1.3,
    peakMultiplier: 1.5,
    description: 'Asosiy futbol maydoni, jamoa o‘yinlari uchun ideal.',
  },
  {
    name: 'Training Pitch',
    fieldType: FieldType.NATURAL_GRASS,
    capacity: 6,
    size: '35x22m',
    pricePerHour: '120000',
    weekendMultiplier: 1.2,
    peakMultiplier: 1.3,
    description: 'Trening va kichik o‘yinlar uchun mo‘ljallangan maydon.',
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

  const localHosts = new Set(['localhost', '127.0.0.1', '::1', 'postgres', 'host.docker.internal']);

  if (!localHosts.has(hostname) && process.env.ALLOW_NON_LOCAL_DB !== 'true') {
    throw new Error(
      `Seed xavfsizlik sabab to‘xtatildi: DATABASE_URL host "${hostname}" local emas. ` +
        'Faqat aniq tasdiqlangan development/test database uchun ALLOW_NON_LOCAL_DB=true ni ongli ravishda sozlang.',
    );
  }
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildDemoDate(offsetDays: number, hour: number, minute = 0): Date {
  const date = addDays(new Date(), offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function seedUsers(): Promise<void> {
  for (const user of demoUsers) {
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
      throw new Error(`Owner topilmadi: ${stadiumTemplate.ownerEmail}. Avval seedUsers bajarilishi kerak.`);
    }

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

async function seedBookingsAndPayments(): Promise<void> {
  const possibleBookings = [
    {
      userEmail: 'user1@stadium.local',
      stadiumName: 'Tashkent Arena',
      fieldName: 'Main Pitch',
      startOffsetDays: 2,
      startHour: 18,
      durationHours: 1,
      status: BookingStatus.CONFIRMED,
      paymentStatus: PaymentStatus.SUCCESS,
      paymentProvider: PaymentProviderType.MOCK,
      notificationType: NotificationType.BOOKING_CONFIRMED,
    },
    {
      userEmail: 'user2@stadium.local',
      stadiumName: 'Green Valley Stadium',
      fieldName: 'Training Pitch',
      startOffsetDays: 4,
      startHour: 16,
      durationHours: 2,
      status: BookingStatus.PAYMENT_PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentProvider: PaymentProviderType.MOCK,
      notificationType: NotificationType.BOOKING_CREATED,
    },
    {
      userEmail: 'user3@stadium.local',
      stadiumName: 'Olympic Mini Pitch',
      fieldName: 'Main Pitch',
      startOffsetDays: 7,
      startHour: 11,
      durationHours: 1,
      status: BookingStatus.CANCELLED,
      paymentStatus: PaymentStatus.REFUNDED,
      paymentProvider: PaymentProviderType.MOCK,
      notificationType: NotificationType.BOOKING_CANCELLED,
    },
  ];

  for (const bookingTemplate of possibleBookings) {
    const user = await prisma.user.findUnique({ where: { email: bookingTemplate.userEmail } });
    if (!user) continue;

    const stadium = await prisma.stadium.findFirst({
      where: { name: bookingTemplate.stadiumName, deletedAt: null },
      select: { id: true },
    });

    if (!stadium) continue;

    const field = await prisma.field.findFirst({
      where: {
        stadiumId: stadium.id,
        name: bookingTemplate.fieldName,
        deletedAt: null,
      },
      include: { stadium: true },
    });

    if (!field) continue;

    const startTime = buildDemoDate(bookingTemplate.startOffsetDays, bookingTemplate.startHour);
    const endTime = new Date(startTime.getTime() + bookingTemplate.durationHours * 60 * 60 * 1000);
    const price = new Prisma.Decimal(field.pricePerHour.toString()).mul(bookingTemplate.durationHours);

    const existingBooking = await prisma.booking.findFirst({
      where: {
        userId: user.id,
        fieldId: field.id,
        startTime,
        endTime,
      },
    });

    if (existingBooking) {
      continue;
    }

    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        fieldId: field.id,
        startTime,
        endTime,
        duration: bookingTemplate.durationHours * 60,
        price,
        status: bookingTemplate.status,
        cancellationReason:
          bookingTemplate.status === BookingStatus.CANCELLED ? 'Demo cancellation for testing' : null,
      },
    });

    const paymentIdempotencyKey = `demo-${booking.id}`;
    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        amount: price,
        currency: 'UZS',
        provider: bookingTemplate.paymentProvider,
        status: bookingTemplate.paymentStatus,
        transactionId: `txn-demo-${booking.id}`,
      },
      create: {
        bookingId: booking.id,
        amount: price,
        currency: 'UZS',
        provider: bookingTemplate.paymentProvider,
        status: bookingTemplate.paymentStatus,
        idempotencyKey: paymentIdempotencyKey,
        transactionId: `txn-demo-${booking.id}`,
      },
    });

    if (bookingTemplate.notificationType) {
      await prisma.notification.upsert({
        where: {
          id: `demo-notification-${booking.id}`,
        },
        update: {},
        create: {
          id: `demo-notification-${booking.id}`,
          userId: user.id,
          type: bookingTemplate.notificationType,
          title: bookingTemplate.status === BookingStatus.CANCELLED ? 'Booking cancelled' : 'Booking confirmed',
          body:
            bookingTemplate.status === BookingStatus.CANCELLED
              ? 'Demo booking is cancelled and refunded.'
              : 'Your demo booking is confirmed and ready to use.',
          metadata: {
            bookingId: booking.id,
            fieldId: field.id,
            stadiumId: stadium.id,
          },
        },
      });
    }
  }
}

async function main(): Promise<void> {
  loadDotEnv();
  assertSafeDatabaseTarget();
  prisma = new PrismaClient();

  await seedUsers();
  await seedStadiumsAndFields();
  await seedBookingsAndPayments();

  const [userCount, stadiumCount, fieldCount, workingHourCount, bookingCount, paymentCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.stadium.count(),
      prisma.field.count(),
      prisma.workingHour.count(),
      prisma.booking.count(),
      prisma.payment.count(),
    ]);

  console.log(
    `Seed yakunlandi. Database jami: Users=${userCount}, Stadiums=${stadiumCount}, Fields=${fieldCount}, WorkingHours=${workingHourCount}, Bookings=${bookingCount}, Payments=${paymentCount}`,
  );
  console.log(
    'Demo hisoblar faqat lokal development/test muhitda ishlatiladi. Login ma’lumotlari docs/demo-credentials.md faylida ko‘rsatilgan.',
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
