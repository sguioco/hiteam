import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

type ErrorResponseBody = {
  statusCode: number;
  message: string | string[];
  error?: string;
  path?: string;
  timestamp?: string;
};

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const body = this.resolveResponseBody(exception, request);

    if (body.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} failed with ${body.statusCode}: ${this.describeException(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(body.statusCode).json(body);
  }

  private resolveResponseBody(
    exception: unknown,
    request: Request,
  ): ErrorResponseBody {
    if (exception instanceof HttpException) {
      return this.resolveHttpExceptionBody(exception, request);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrismaKnownErrorBody(exception, request);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return this.buildBody(
        HttpStatus.BAD_REQUEST,
        'The request contains invalid data.',
        request,
      );
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return this.buildBody(
        HttpStatus.SERVICE_UNAVAILABLE,
        'The service is temporarily unavailable. Please try again.',
        request,
      );
    }

    return this.buildBody(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Unexpected server error. Please try again.',
      request,
    );
  }

  private resolveHttpExceptionBody(
    exception: HttpException,
    request: Request,
  ): ErrorResponseBody {
    const status = exception.getStatus();

    if (status >= 500) {
      return this.buildBody(
        status,
        status === HttpStatus.SERVICE_UNAVAILABLE
          ? 'The service is temporarily unavailable. Please try again.'
          : 'Unexpected server error. Please try again.',
        request,
      );
    }

    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === 'string') {
      return this.buildBody(status, exceptionResponse, request);
    }

    if (this.isObject(exceptionResponse)) {
      const message = this.normalizeMessage(
        exceptionResponse.message,
        exception.message,
      );
      const error = typeof exceptionResponse.error === 'string'
        ? exceptionResponse.error
        : this.statusLabel(status);

      return {
        statusCode: status,
        message,
        error,
        path: request.url,
        timestamp: new Date().toISOString(),
      };
    }

    return this.buildBody(status, exception.message, request);
  }

  private resolvePrismaKnownErrorBody(
    exception: Prisma.PrismaClientKnownRequestError,
    request: Request,
  ): ErrorResponseBody {
    switch (exception.code) {
      case 'P2002':
        return this.buildBody(
          HttpStatus.CONFLICT,
          'This record already exists.',
          request,
        );
      case 'P2003':
      case 'P2014':
        return this.buildBody(
          HttpStatus.BAD_REQUEST,
          'The request references data that cannot be changed.',
          request,
        );
      case 'P2025':
        return this.buildBody(HttpStatus.NOT_FOUND, 'Record not found.', request);
      case 'P2022':
        return this.buildBody(
          HttpStatus.SERVICE_UNAVAILABLE,
          'The database schema is not up to date. Apply the latest migration.',
          request,
        );
      default:
        return this.buildBody(
          HttpStatus.BAD_REQUEST,
          'Database request failed. Check the submitted data.',
          request,
        );
    }
  }

  private buildBody(
    statusCode: number,
    message: string | string[],
    request: Request,
  ): ErrorResponseBody {
    return {
      statusCode,
      message,
      error: this.statusLabel(statusCode),
      path: request.url,
      timestamp: new Date().toISOString(),
    };
  }

  private normalizeMessage(
    message: unknown,
    fallback: string,
  ): string | string[] {
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message;
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return fallback;
  }

  private statusLabel(statusCode: number) {
    return HttpStatus[statusCode] ?? 'Error';
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private describeException(exception: unknown) {
    if (exception instanceof Error) {
      return `${exception.name}: ${exception.message}`;
    }

    return String(exception);
  }
}
