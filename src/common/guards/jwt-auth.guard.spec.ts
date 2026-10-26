import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCodes } from '../constants/error-codes';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('returns the standard auth error for an expired access token', () => {
    const guard = new JwtAuthGuard({} as PrismaService);
    const expiredToken = Object.assign(new Error('jwt expired'), {
      name: 'TokenExpiredError',
    });

    let thrown: unknown;
    try {
      guard.handleRequest(
        null,
        null,
        expiredToken,
        {} as ExecutionContext,
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(UnauthorizedException);
    if (thrown instanceof UnauthorizedException) {
      expect(thrown.getResponse()).toEqual({
        error: ErrorCodes.AUTH_TOKEN_EXPIRED,
        message: 'Access token muddati tugagan',
      });
    }
  });
});
