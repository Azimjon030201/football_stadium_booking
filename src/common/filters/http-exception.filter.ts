// src/common/filters/http-exception.filter.ts
import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
  } from '@nestjs/common';
  import { Request, Response } from 'express';
  
  const STATUS_TO_CODE: Record<number, string> = {
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN_RESOURCE',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'RATE_LIMIT_EXCEEDED',
  };
  
  @Catch()
  export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);
  
    catch(exception: unknown, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const req = ctx.getRequest<Request>();
      const res = ctx.getResponse<Response>();
  
      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      let error = 'INTERNAL_SERVER_ERROR';
      let message = 'Internal server error';
      let details: unknown;
  
      if (exception instanceof HttpException) {
        statusCode = exception.getStatus();
        const body = exception.getResponse() as any;
  
        error = body?.code ?? STATUS_TO_CODE[statusCode] ?? 'ERROR';
        message =
          typeof body === 'string'
            ? body
            : typeof body?.message === 'string'
              ? body.message
              : exception.message;
        details = body?.details;
      } else {
        this.logger.error(exception);
      }
  
      res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        error,
        ...(details ? { details } : {}),
        timestamp: new Date().toISOString(),
        path: req.url,
      });
    }
  }