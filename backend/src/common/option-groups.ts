import { z } from 'zod';
import type { OptionGroup } from './pricing.js';

const optionGroups = z.array(
  z.object({
    group: z.string(),
    multi: z.boolean(),
    choices: z.array(
      z.object({ name: z.string(), price: z.number(), cost: z.number() }),
    ),
  }),
);

/**
 * Parsed, not cast: service_types.options is also written by the seed script and
 * by hand, and a malformed row would surface as a TypeError inside pricing.
 */
export const readOptionGroups = (json: unknown): OptionGroup[] =>
  optionGroups.parse(json ?? []);
