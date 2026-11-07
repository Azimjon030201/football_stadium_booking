import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { agent } from 'supertest';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';

describe('Auth edge-case validation (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof agent>;
  const authService = {
    login: jest.fn(),
    register: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
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
    http = agent(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['bo‘sh JSON', {}, 'VALIDATION_ERROR'],
    [
      '1000 belgili email',
      { email: 'a'.repeat(1000), password: 'StrongPass123' },
      'VALIDATION_ERROR',
    ],
    [
      '1000 belgili parol',
      { email: 'user@example.com', password: 'A1'.repeat(500) },
      'VALIDATION_ERROR',
    ],
    [
      'noto‘g‘ri email',
      { email: 'salom', password: 'StrongPass123' },
      'VALIDATION_ERROR',
    ],
    [
      'SQL injection ko‘rinishidagi email',
      { email: "' OR 1=1--", password: 'StrongPass123' },
      'VALIDATION_ERROR',
    ],
  ])(
    'login: %s -> 400 JSON validation error',
    async (_caseName, body, error) => {
      const response = await http
        .post('/api/auth/login')
        .send(body)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 400,
        error,
        path: '/api/auth/login',
      });
      expect(
        typeof response.body.message === 'string' ||
          (Array.isArray(response.body.message) &&
            response.body.message.every(
              (message: unknown) => typeof message === 'string',
            )),
      ).toBe(true);
      expect(response.body.timestamp).toEqual(expect.any(String));
      expect(authService.login).not.toHaveBeenCalled();
    },
  );

  it('register: 1000 belgili email -> 400 JSON validation error', async () => {
    const response = await http
      .post('/api/auth/register')
      .send({
        email: 'a'.repeat(1000),
        password: 'StrongPass123',
        firstName: 'Ali',
        lastName: 'Valiyev',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      path: '/api/auth/register',
    });
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('register: 1000 belgili parol -> 400 JSON validation error', async () => {
    const response = await http
      .post('/api/auth/register')
      .send({
        email: 'user@example.com',
        password: 'A1a'.repeat(333) + 'A',
        firstName: 'Ali',
        lastName: 'Valiyev',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      path: '/api/auth/register',
    });
    expect(authService.register).not.toHaveBeenCalled();
  });
});
