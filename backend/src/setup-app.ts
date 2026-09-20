import {
  type INestApplication,
  UnprocessableEntityException,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor.js';

/** Flattens class-validator errors to { "items.0.qtyIn": "message" }. */
// "must be shorter than 72 characters" under an empty box is useless: when a
// field fails several rules, the one about it being missing or the wrong type
// is the one worth showing.
const CONSTRAINT_PRIORITY = [
  'isDefined',
  'isNotEmpty',
  'isNotEmptyObject',
  'isObject',
  'isArray',
  'isString',
  'isBoolean',
  'isNumber',
  'isInt',
  'isUuid',
  'isEmail',
  'isIn',
  'matches',
  'arrayMinSize',
  'min',
  'minLength',
];

const bestMessage = (constraints: Record<string, string>) => {
  const keys = Object.keys(constraints);
  const ranked = keys.slice().sort((a, b) => {
    const rank = (key: string) => {
      const index = CONSTRAINT_PRIORITY.indexOf(key);
      return index === -1 ? CONSTRAINT_PRIORITY.length : index;
    };
    return rank(a) - rank(b);
  });
  return constraints[ranked[0] ?? keys[0]!];
};

export function toFields(
  errors: ValidationError[],
  prefix = '',
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const e of errors) {
    const path = prefix + e.property;
    const first = e.constraints && bestMessage(e.constraints);
    if (first) fields[path] = first;
    if (e.children?.length)
      Object.assign(fields, toFields(e.children, `${path}.`));
  }
  return fields;
}

/** Versioned from the start: an installed PWA can run a cached build for weeks. */
export const API_PREFIX = 'api/v1';

/** Global app setup shared by main.ts and the e2e tests. */
export function setupApp(app: INestApplication) {
  // Health checks stay unprefixed so platform probes can find them.
  app.setGlobalPrefix(API_PREFIX, { exclude: ['health/live', 'health/ready'] });
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new UnprocessableEntityException({
          message: 'Validation failed',
          fields: toFields(errors),
        }),
    }),
  );
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  // Bodies are small; an unbounded one is a cheap way to exhaust memory.
  app.use(json({ limit: '256kb' }));
  app.use(urlencoded({ extended: false, limit: '256kb' }));
  app.enableShutdownHooks();
}
