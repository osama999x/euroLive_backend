import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { Environment } from '../enums';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProduction =
      this.configService.get<string>('app.env') === Environment.Production;

    const { status, message, errors } = this.normalize(exception, isProduction);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${status} ${message}`);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private normalize(
    exception: unknown,
    isProduction: boolean,
  ): { status: number; message: string | string[]; errors?: unknown } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return { status, message: payload };
      }

      const response = payload as Record<string, unknown>;
      return {
        status,
        message: (response.message as string | string[]) || exception.message,
        errors: response.error,
      };
    }

    if (exception instanceof QueryFailedError) {
      return this.handleQueryError(exception);
    }

    const pgCode = (exception as { code?: string })?.code;
    if (pgCode) {
      return this.handlePostgresCode(pgCode, exception);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: isProduction ? 'Internal server error' : this.getErrorMessage(exception),
    };
  }

  private handleQueryError(error: QueryFailedError): {
    status: number;
    message: string;
  } {
    const driverError = error.driverError as { code?: string; detail?: string };
    return this.handlePostgresCode(driverError?.code, error);
  }

  private handlePostgresCode(
    code: string | undefined,
    error: unknown,
  ): { status: number; message: string } {
    const detail = (error as { detail?: string })?.detail;

    switch (code) {
      case '23505':
        return {
          status: HttpStatus.CONFLICT,
          message: this.extractConstraintField(detail, 'already exists'),
        };
      case '23503':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Related record does not exist',
        };
      case '23502':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: this.extractConstraintField(detail, 'is required'),
        };
      case '22P02':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid input format',
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Database operation failed',
        };
    }
  }

  private extractConstraintField(detail: string | undefined, suffix: string): string {
    const match = detail?.match(/\((.*?)\)/);
    if (match?.[1]) {
      return `${match[1]} ${suffix}`;
    }
    return `Record ${suffix}`;
  }

  private getErrorMessage(exception: unknown): string {
    if (exception instanceof Error) {
      return exception.message;
    }
    return 'Internal server error';
  }
}
