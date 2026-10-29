import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { agent } from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ErrorCodes } from '../src/common/constants/error-codes';

jest.setTimeout(60000);

describe('RBAC edge cases (e2e)', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService;
  let http: ReturnType<typeof agent>;

  type Account = {
    id: string;
    token: string;
  };

  let admin: Account;
  let owner1: Account;
  let owner2: Account;
  let user: Account;

  const userIds: string[] = [];
  const stadiumIds: string[] = [];
  const runId = randomUUID();
  const password = 'RbacTest123!';

  async function createAccount(
    label: string,
    role: UserRole,
  ): Promise<Account> {
    const email = `rbac-${label}-${runId}@example.com`;

    const registered = await http
      .post('/api/auth/register')
      .send({
        email,
        password,
        firstName: 'Rbac',
        lastName: 'Test',
      })
      .expect(201);

    const id = registered.body.id as string;
    expect(typeof id).toBe('string');
    expect(id).toBeTruthy();
    userIds.push(id);

    // Test fixture: rol login qilishdan oldin belgilanadi.
    await prisma.user.update({
      where: { id },
      data: { role, status: 'ACTIVE' },
    });

    const login = await http
      .post('/api/auth/login')
      .send({ email, password })
      .expect(201);

    const token = login.body.accessToken as string;
    expect(typeof token).toBe('string');
    expect(token).toBeTruthy();

    return { id, token };
  }

  async function createStadium() {
    const stadium = await prisma.stadium.create({
      data: {
        ownerId: owner1.id,
        name: 'RBAC Test Stadion',
        address: 'Toshkent, Chilonzor test manzil',
        latitude: 41.2995,
        longitude: 69.2401,
        phone: '+998901234567',
        status: 'PENDING',
      },
    });

    stadiumIds.push(stadium.id);
    return stadium;
  }

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Faqat rate limit o'chiriladi. Auth/RBAC/Ownership haqiqiy.
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();

    prisma = app.get(PrismaService);
    http = agent(app.getHttpServer());

    admin = await createAccount('admin', UserRole.ADMIN);
    owner1 = await createAccount('owner1', UserRole.OWNER);
    owner2 = await createAccount('owner2', UserRole.OWNER);
    user = await createAccount('user', UserRole.USER);
  });

  afterAll(async () => {
    try {
      if (prisma) {
        // Faqat shu test yaratgan ma'lumotlar o'chiriladi.
        await prisma.stadium.deleteMany({
          where: { id: { in: stadiumIds } },
        });

        await prisma.notification.deleteMany({
          where: { userId: { in: userIds } },
        });

        await prisma.auditLog.deleteMany({
          where: { actorId: { in: userIds } },
        });

        await prisma.refreshToken.deleteMany({
          where: { userId: { in: userIds } },
        });

        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }
    } finally {
      await app?.close();
    }
  });

  it('USER -> admin endpoint: 403 FORBIDDEN_RESOURCE', async () => {
    const response = await http
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(403);

    expect(response.body.error).toBe(ErrorCodes.FORBIDDEN_RESOURCE);
  });

  it('Tokensiz -> himoyalangan endpoint: 401', async () => {
    await http.get('/api/users/me').expect(401);
  });

  it('OWNER -> admin endpoint: 403', async () => {
    const response = await http
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${owner1.token}`)
      .expect(403);

    expect(response.body.error).toBe(ErrorCodes.FORBIDDEN_RESOURCE);
  });

  it('owner2 -> owner1 stadioni PATCH: 403', async () => {
    const stadium = await createStadium();

    const response = await http
      .patch(`/api/stadiums/${stadium.id}`)
      .set('Authorization', `Bearer ${owner2.token}`)
      .send({ name: 'Unauthorized Change' })
      .expect(403);

    expect(response.body.error).toBe(ErrorCodes.FORBIDDEN_RESOURCE);

    const saved = await prisma.stadium.findUniqueOrThrow({
      where: { id: stadium.id },
    });

    expect(saved.name).toBe(stadium.name);
  });

  it('owner2 -> owner1 stadioni DELETE: 403', async () => {
    const stadium = await createStadium();

    const response = await http
      .delete(`/api/stadiums/${stadium.id}`)
      .set('Authorization', `Bearer ${owner2.token}`)
      .expect(403);

    expect(response.body.error).toBe(ErrorCodes.FORBIDDEN_RESOURCE);

    const saved = await prisma.stadium.findUniqueOrThrow({
      where: { id: stadium.id },
    });

    expect(saved.deletedAt).toBeNull();
    expect(saved.status).toBe(stadium.status);
  });

  it('owner1 -> o‘z stadionini PATCH: 200', async () => {
    const stadium = await createStadium();
    const name = 'RBAC Updated Stadion';

    await http
      .patch(`/api/stadiums/${stadium.id}`)
      .set('Authorization', `Bearer ${owner1.token}`)
      .send({ name })
      .expect(200);

    const saved = await prisma.stadium.findUniqueOrThrow({
      where: { id: stadium.id },
    });

    expect(saved.name).toBe(name);
    expect(saved.ownerId).toBe(owner1.id);
  });

  it('ADMIN -> boshqa owner stadionini tasdiqlash: 200', async () => {
    const stadium = await createStadium();

    await http
      .patch(`/api/stadiums/admin/stadiums/${stadium.id}/approve`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    const saved = await prisma.stadium.findUniqueOrThrow({
      where: { id: stadium.id },
    });

    expect(saved.status).toBe('ACTIVE');
  });

  it('Bloklangan USER -> eski token bilan so‘rov: 403 USER_BLOCKED', async () => {
    // Boshqa testlardan mustaqil hisob.
    const blockedUser = await createAccount('blocked', UserRole.USER);

    await http
      .get('/api/users/me')
      .set('Authorization', `Bearer ${blockedUser.token}`)
      .expect(200);

    await http
      .patch(`/api/admin/users/${blockedUser.id}/block`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'BLOCKED' })
      .expect(200);

    const saved = await prisma.user.findUniqueOrThrow({
      where: { id: blockedUser.id },
    });
    expect(saved.status).toBe('BLOCKED');

    const response = await http
      .get('/api/users/me')
      .set('Authorization', `Bearer ${blockedUser.token}`)
      .expect(403);

    expect(response.body.error).toBe(ErrorCodes.USER_BLOCKED);
  });

  it('ADMIN -> status=NOTREAL: 400', async () => {
    // Avval shu token va endpoint to'g'ri ishlashini tekshiramiz.
    await http
      .get('/api/stadiums/admin/stadiums')
      .query({ status: 'PENDING' })
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    await http
      .get('/api/stadiums/admin/stadiums')
      .query({ status: 'NOTREAL' })
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(400);
  });


    it('ADMIN -> o‘zini bloklash: 403', async () => {

    const response = await http
      .patch(`/api/admin/users/${admin.id}/block`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'BLOCKED' })
      .expect(403);

    expect(response.body.error).toBe(ErrorCodes.FORBIDDEN_RESOURCE);

    const saved = await prisma.user.findUniqueOrThrow({
      where: { id: admin.id },
    });

    expect(saved.status).toBe('ACTIVE');
  });
});