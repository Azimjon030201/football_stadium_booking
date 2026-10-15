
import { HttpException } from '@nestjs/common';
import { ErrorCodeType } from './error-codes';

export class AppException extends HttpException {
  constructor(
    status: number,
    public readonly code: ErrorCodeType,
    message: string,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}