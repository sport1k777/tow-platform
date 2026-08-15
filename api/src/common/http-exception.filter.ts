import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type ErrorBody = {
  statusCode: number;
  error: string;
  message: string;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();

    const body = this.toBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${body.statusCode}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : typeof payload === 'object' &&
              payload !== null &&
              'message' in payload
            ? String(
                Array.isArray((payload as { message: unknown }).message)
                  ? (payload as { message: string[] }).message.join(', ')
                  : (payload as { message: unknown }).message,
              )
            : exception.message;

      return {
        statusCode: status,
        error: HttpStatus[status] ?? 'Error',
        message,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Unexpected server error',
    };
  }
}
