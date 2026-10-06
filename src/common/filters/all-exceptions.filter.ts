import {
  Catch,
  Logger,
  HttpStatus,
  HttpException,
  ArgumentsHost,
  ExceptionFilter,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorName = 'UnknownError';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorName = exception.constructor.name;

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;

        if (responseObj.error) {
          details = responseObj.error;
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorName = exception.constructor.name;
    }

    this.log(status, errorName, message, exception, request);

    const errorResponse: any = {
      success: false,
      message: message,
      error: errorName,
    };

    if (details) {
      errorResponse.details = details;
    }

    response.status(status).json(errorResponse);
  }

  private log(
    status: number,
    errorName: string,
    message: string | string[],
    exception: unknown,
    request: Request,
  ): void {
    const text = typeof message === 'string' ? message : message.join('; ');
    const route = `${request.method} ${request.url}`;

    if (status >= 500) {
      this.logger.error(
        `${errorName} [${status}] ${route}: ${text}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      return;
    }

    if (status >= 400 && status < 500) {
      this.logger.warn(
        `${errorName} [${status}] ${route}: ${text}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }
  }
}
