import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express'; // 👈 IMPORT FALTANDO

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorName = 'UnknownError';

    // Verifica se é HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
      errorName = exception.constructor.name;
    }
    // Verifica se é Error comum
    else if (exception instanceof Error) {
      message = exception.message;
      errorName = exception.constructor.name;
    }

    response.status(status).json({
      success: false,
      message: message,
      error: errorName,
    });
  }
}
