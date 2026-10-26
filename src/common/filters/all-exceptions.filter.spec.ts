import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  type ArgumentsHost,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ErrorCodes } from '../constants/error-codes';

describe('AllExceptionsFilter', () => {
  const cases = [
    {
      name: 'validation errors',
      exception: new BadRequestException({
        message: ['email must be an email'],
        error: 'Bad Request',
      }),
      statusCode: 400,
      error: ErrorCodes.VALIDATION_ERROR,
    },
    {
      name: 'duplicate users',
      exception: new ConflictException({
        error: ErrorCodes.USER_ALREADY_EXISTS,
        message: "Bu email allaqachon ro'yxatdan o'tgan",
      }),
      statusCode: 409,
      error: ErrorCodes.USER_ALREADY_EXISTS,
    },
    {
      name: 'invalid credentials',
      exception: new UnauthorizedException({
        error: ErrorCodes.AUTH_INVALID_CREDENTIALS,
      }),
      statusCode: 401,
      error: ErrorCodes.AUTH_INVALID_CREDENTIALS,
    },
    {
      name: 'blocked users',
      exception: new ForbiddenException({
        error: ErrorCodes.USER_BLOCKED,
        message: 'Hisobingiz bloklangan',
      }),
      statusCode: 403,
      error: ErrorCodes.USER_BLOCKED,
    },
    {
      name: 'expired tokens',
      exception: new UnauthorizedException({
        error: ErrorCodes.AUTH_TOKEN_EXPIRED,
        message: 'Access token muddati tugagan',
      }),
      statusCode: 401,
      error: ErrorCodes.AUTH_TOKEN_EXPIRED,
    },
  ];

  it.each(cases)(
    'returns the standard response for $name',
    ({ exception, statusCode, error }) => {
      const response = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const request = { originalUrl: '/api/auth/login' };
      const host = {
        switchToHttp: () => ({
          getResponse: () => response,
          getRequest: () => request,
        }),
      } as unknown as ArgumentsHost;

      new AllExceptionsFilter().catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(statusCode);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode,
          error,
          timestamp: expect.any(String),
          path: request.originalUrl,
        }),
      );
      expect(
        Object.keys(response.json.mock.calls[0][0]).sort(),
      ).toEqual(
        ['success', 'statusCode', 'message', 'error', 'timestamp', 'path'].sort(),
      );
      expect(
        Number.isNaN(Date.parse(response.json.mock.calls[0][0].timestamp)),
      ).toBe(false);
    },
  );
});
