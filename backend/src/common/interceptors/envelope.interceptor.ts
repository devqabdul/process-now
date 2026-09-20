import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { map } from 'rxjs';

/** Wraps every successful response as { status_code, message, data }. */
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const res = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data: unknown) => ({
        status_code: res.statusCode,
        message: 'OK',
        data: data ?? null,
      })),
    );
  }
}
