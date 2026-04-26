import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    const message =
      typeof errorResponse === 'string'
        ? errorResponse
        : (errorResponse as any)?.message ??
          (exception as any)?.message ??
          'Internal server error';

    res.status(status).json({
      success: false,
      error: {
        message,
        path: req.path,
        statusCode: status,
      },
    });
  }
}
