import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../types/auth-user.js';

const PRISMA_STATUS: Record<string, [number, string]> = {
  P2002: [HttpStatus.CONFLICT, 'Already exists'],
  P2025: [HttpStatus.NOT_FOUND, 'Not found'],
  P2003: [HttpStatus.CONFLICT, 'Related record is missing or still in use'],
  P2000: [HttpStatus.UNPROCESSABLE_ENTITY, 'Value is too long for this field'],
  P2028: [
    HttpStatus.SERVICE_UNAVAILABLE,
    'The request took too long, try again',
  ],
};

/** Returns every error as { status_code, message, fields? }. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request & { user?: AuthUser }>();
    const { status, message, fields } = this.toError(exception);

    // Anything 5xx is an incident: log who hit what, or the report is
    // "billing is broken" with nothing to match it against.
    if (status >= 500) {
      const { userId, companyId } = req.user ?? {};
      this.logger.error(
        `${status} ${req.method} ${req.originalUrl} user=${userId ?? '-'} company=${companyId ?? '-'}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res
      .status(status)
      .json({ status_code: status, message, ...(fields && { fields }) });
  }

  private toError(exception: unknown): {
    status: number;
    message: string;
    fields?: Record<string, string>;
  } {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        return { status: exception.getStatus(), message: body };
      }
      const { message, fields } = body as {
        message?: string | string[];
        fields?: Record<string, string>;
      };
      return {
        status: exception.getStatus(),
        message: Array.isArray(message)
          ? message.join(', ')
          : (message ?? exception.message),
        fields,
      };
    }
    // Body parser errors carry a status but aren't HttpExceptions: an oversized
    // body is a 413 and malformed JSON a 400, not "internal server error".
    const bodyParser = exception as { type?: string; status?: number };
    if (bodyParser?.type === 'entity.too.large') {
      return {
        status: HttpStatus.PAYLOAD_TOO_LARGE,
        message: 'That request is too large',
      };
    }
    if (bodyParser?.type === 'entity.parse.failed') {
      return { status: HttpStatus.BAD_REQUEST, message: 'Malformed JSON body' };
    }
    // Pool exhaustion is temporary and the caller can retry; it is not a bug in
    // the request, and it should not read as one.
    if (
      exception instanceof Error &&
      /max clients reached|too many connections/i.test(exception.message)
    ) {
      this.logger.error('Database connection pool exhausted');
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'The service is busy, try again in a moment',
      };
    }
    if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      exception.code in PRISMA_STATUS
    ) {
      const [status, message] = PRISMA_STATUS[exception.code];
      // Only the code and meta: the full error echoes the query arguments,
      // which on a user create includes the password hash.
      this.logger.warn(
        `Prisma ${exception.code} ${JSON.stringify(exception.meta)}`,
      );
      return { status, message };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}
