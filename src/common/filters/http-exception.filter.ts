import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? exception.getResponse()
      : 'Error interno del servidor.';

    const errorBody =
      typeof message === 'object'
        ? message
        : { message, error: HttpStatus[status] };

    this.logger.error(
      `${request.method} ${request.url} → ${status}`,
      isHttpException ? undefined : (exception as Error)?.stack,
    );

    response.status(status).json({
      ...errorBody,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
