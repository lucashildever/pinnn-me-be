import {
  Catch,
  HttpStatus,
  HttpException,
  ArgumentsHost,
  ExceptionFilter,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

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
}
