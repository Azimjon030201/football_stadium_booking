
import { HttpException } from '@nestjs/common';
import type { ErrorCode as ErrorCodeType } from '../constants/error-codes';

export class AppException extends HttpException {
  constructor(
    status: number,
    public readonly code: ErrorCodeType,
    message: string,
    public readonly details?: unknown,
  ) {
    super({ error: code, message, details }, status);
  }
}