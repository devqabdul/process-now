import {
  applyDecorators,
  Injectable,
  type PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { isDateString } from './dates.js';
import { normalizeEmail, toMobileDigits } from './identifier.js';

// Postgres text cannot hold \u0000; pasted clipboard junk otherwise reaches the
// driver and comes back as a 500.
const stripNul = (s: string) => s.replace(/\0/g, '');

const whenString =
  (fn: (s: string) => string) =>
  ({ value }: { value: unknown }) =>
    typeof value === 'string' ? fn(stripNul(value)) : value;

/** Any free-text field: NUL bytes removed before validation. */
export const IsText = (max: number) =>
  applyDecorators(Transform(whenString((s) => s)), IsString(), MaxLength(max));

/** Trimmed, non-empty string. */
export const IsName = (max = 100) =>
  applyDecorators(
    Transform(whenString((s) => s.trim())),
    IsString(),
    IsNotEmpty(),
    MaxLength(max),
  );

/** Indian mobile number, stored as 10 digits. */
export const IsPhone = () =>
  applyDecorators(
    Transform(whenString(toMobileDigits)),
    IsString(),
    Matches(/^\d{10}$/, { message: 'Enter a 10-digit mobile number' }),
  );

/** Stored lowercase. */
export const IsEmailAddress = () =>
  applyDecorators(
    Transform(whenString(normalizeEmail)),
    IsEmail({}, { message: 'Enter a valid email' }),
    MaxLength(254),
  );

/** 15-character GSTIN, stored uppercase. */
export const IsGstNo = () =>
  applyDecorators(
    Transform(whenString((s) => s.trim().toUpperCase())),
    Matches(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, {
      message: 'Enter a valid 15-character GST number',
    }),
  );

/**
 * Optional, but an explicit `null` is rejected.
 * class-validator's own `@IsOptional()` skips every other validator on `null`,
 * so `{ "gstRate": null }` would pass validation and be written through.
 */
export const Optional = () => ValidateIf((_, value) => value !== undefined);

// Ceilings match the DECIMAL(12,2) / DECIMAL(12,3) columns, so an extra zero
// comes back as a 422 field error instead of a Postgres numeric overflow 500.
export const MAX_MONEY = 9_999_999_999.99;
export const MAX_QTY = 999_999_999.999;

/** Non-negative amount with at most `places` decimals, bounded by its column. */
export const IsAmount = (places = 2) =>
  applyDecorators(
    IsNumber({ maxDecimalPlaces: places }),
    Min(0),
    Max(places >= 3 ? MAX_QTY : MAX_MONEY),
  );

/** Shown in front of order and bill numbers: 2-6 letters, stored uppercase. */
export const IsNumberPrefix = () =>
  applyDecorators(
    Transform(whenString((v) => v.trim().toUpperCase())),
    Matches(/^[A-Z]{2,6}$/, {
      message: 'Use 2 to 6 letters, for example FN',
    }),
  );

/** 422 in the same shape as ValidationPipe errors. */
export const fieldError = (field: string, message: string) =>
  new UnprocessableEntityException({ message, fields: { [field]: message } });

/** Calendar date as YYYY-MM-DD. */
export const IsDateOnly = () =>
  applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use the YYYY-MM-DD format' }),
    IsISO8601({ strict: true }, { message: 'Not a real date' }),
  );

/**
 * Route param ids, in the same 422 + `fields` shape as body validation — Nest's
 * ParseUUIDPipe answers 400 with no field, which a form cannot bind to.
 */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, string> {
  constructor(private readonly field = 'id') {}

  transform(value: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      throw fieldError(this.field, 'Not a valid id');
    }
    return value;
  }
}

/** Route param version of IsDateOnly. */
@Injectable()
export class ParseDatePipe implements PipeTransform<string, string> {
  transform(value: string) {
    if (!isDateString(value))
      throw fieldError('date', 'Use a real date as YYYY-MM-DD');
    return value;
  }
}
