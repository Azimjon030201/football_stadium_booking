import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { agent } from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ErrorCodes } from '../src/common/constants/error-codes';

jest.setTimeout(60000);

describe('Cross-module error format (e2e)', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService | undefined;
  let http: ReturnType<typeof agent>;
  let token: string;

  const userIds: string[] = [];
  const email = `error-format-${randomUUID()}@example.com`;

  const registration = {
    email,
    password: 'ErrorTest123!',
    firstName: 'Error',
    lastName: 'Test',
  };

  function expectStandardError(
    body: Record<string, unknown>,
    status: number,
    code: string,
    path: string,
  ) {
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(status);

    const validMessage =
      typeof body.message === 'string' ||
      (Array.isArray(body.message) &&
        body.message.every((item) => typeof item === 'string'));

    expect(validMessage).toBe(true);
    expect(body.error).toMatch(/^[A-Z][A-Z0-9_]*$/);
    expect(body.error).toBe(code);

    expect(typeof body.timestamp).toBe('string');
    expect(
      Number.isNaN(Date.parse(body.timestamp as string)),
    ).toBe(false);

    expect(body.path).toBe(path);
  }

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
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

    const registered = await http
      .post('/api/auth/register')
      .send(registration)
      .expect(201);

    expect(typeof registered.body.id).toBe('string');
    expect(registered.body.id).toBeTruthy();
    userIds.push(registered.body.id);

    const login = await http
      .post('/api/auth/login')
      .send({
        email,
        password: registration.password,
      })
      .expect(201);

    token = login.body.accessToken;
    expect(typeof token).toBe('string');
    expect(token).toBeTruthy();

    // Keyingi testlar yaroqli token bilan bajarilishini tasdiqlash.
    await http
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  afterAll(async () => {
    try {
      if (prisma) {
        // Faqat shu test yaratgan foydalanuvchining ma'lumotlari.
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

  it('Users: tokensiz profil -> 401 UNAUTHORIZED', async () => {
    const path = '/api/users/me';
    const response = await http.get(path).expect(401);

    expectStandardError(
      response.body,
      401,
      ErrorCodes.UNAUTHORIZED,
      path,
    );
  });

  it('Auth: bo‘sh login body -> 400 VALIDATION_ERROR', async () => {
    const path = '/api/auth/login';
    const response = await http.post(path).send({}).expect(400);

    expectStandardError(
      response.body,
      400,
      ErrorCodes.VALIDATION_ERROR,
      path,
    );
  });

  it('Auth: takroriy email -> 409 USER_ALREADY_EXISTS', async () => {
    const path = '/api/auth/register';
    const response = await http
      .post(path)
      .send(registration)
      .expect(409);

    expectStandardError(
      response.body,
      409,
      ErrorCodes.USER_ALREADY_EXISTS,
      path,
    );
  });

  it('Users: USER -> admin endpoint: 403 FORBIDDEN_RESOURCE', async () => {
    const path = '/api/admin/users';
    const response = await http
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expectStandardError(
      response.body,
      403,
      ErrorCodes.FORBIDDEN_RESOURCE,
      path,
    );
  });

  it('Stadium: mavjud bo‘lmagan ID -> 404 STADIUM_NOT_FOUND', async () => {
    const path = `/api/stadiums/${randomUUID()}`;
    const response = await http.get(path).expect(404);

    expectStandardError(
      response.body,
      404,
      ErrorCodes.STADIUM_NOT_FOUND,
      path,
    );
  });

  it('Field: mavjud bo‘lmagan ID -> 404 FIELD_NOT_FOUND', async () => {
    const path = `/api/fields/${randomUUID()}`;
    const response = await http.get(path).expect(404);

    expectStandardError(
      response.body,
      404,
      ErrorCodes.FIELD_NOT_FOUND,
      path,
    );
  });

  it('Booking: mavjud bo‘lmagan ID -> 404 BOOKING_NOT_FOUND', async () => {
    const path = `/api/bookings/${randomUUID()}`;
    const response = await http
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expectStandardError(
      response.body,
      404,
      ErrorCodes.BOOKING_NOT_FOUND,
      path,
    );
  });

  it('Payment: mavjud bo‘lmagan ID -> 404 PAYMENT_NOT_FOUND', async () => {
    const path = `/api/payments/${randomUUID()}`;
    const response = await http
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expectStandardError(
      response.body,
      404,
      ErrorCodes.PAYMENT_NOT_FOUND,
      path,
    );
  });

  it('Noma’lum endpoint -> 404 NOT_FOUND', async () => {
    const path = '/api/mavjud-emas';
    const response = await http.get(path).expect(404);

    expectStandardError(
      response.body,
      404,
      ErrorCodes.NOT_FOUND,
      path,
    );
  });
});