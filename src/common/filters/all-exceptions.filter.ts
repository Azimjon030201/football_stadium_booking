import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorCodes } from '../constants/error-codes';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    let statusCode = 500;
    let message: string | string[] = 'Kutilmagan server xatosi';
    let error: string = ErrorCodes.INTERNAL_ERROR;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();

      const defaultErrors: Record<number, string> = {
        400: ErrorCodes.VALIDATION_ERROR,
        401: ErrorCodes.UNAUTHORIZED,
        403: ErrorCodes.FORBIDDEN_RESOURCE,
        404: ErrorCodes.NOT_FOUND,
        409: ErrorCodes.CONFLICT,
        429: ErrorCodes.RATE_LIMIT_EXCEEDED,
      };

      error = defaultErrors[statusCode] ?? ErrorCodes.HTTP_ERROR;

      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
      } else {
        const details = body as {
          message?: unknown;
          error?: unknown;
        };

        message = exception.message;

        if (typeof details.message === 'string') {
          message = details.message;
        } else if (
          Array.isArray(details.message) &&
          details.message.every(
            (item: unknown) => typeof item === 'string',
          )
        ) {
          message = details.message as string[];
        }

        if (
          typeof details.error === 'string' &&
          /^[A-Z][A-Z0-9_]*$/.test(details.error)
        ) {
          error = details.error;
        }
      }
    }

    if (statusCode >= 500) {
      this.logger.error(
        exception instanceof Error
          ? exception.stack ?? exception.message
          : 'Noma’lum server xatosi',
      );

      message = 'Kutilmagan server xatosi';
      error = ErrorCodes.INTERNAL_ERROR;
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }
}