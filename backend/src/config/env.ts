import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  JWT_SECRET: z.string().min(32),
  /** Comma-separated frontend origins allowed by CORS, e.g. prod + local dev. */
  WEB_ORIGIN: z
    .string()
    .transform((v) =>
      v
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url()).min(1)),
  PORT: z.coerce.number().int().positive().default(1010),
  // No default: on a host that doesn't set it, a default of 'development' would
  // silently drop the Secure flag from the session cookie.
  NODE_ENV: z.enum(['development', 'test', 'production']),
  /**
   * Proxy hops in front of the app (Express `trust proxy`). 0 = direct.
   * Wrong value = every client looks like the proxy, so rate limits apply to
   * everyone at once.
   */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  /** Per-instance Postgres connections. Divide the database's cap by replicas. */
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  /**
   * Failed-login allowance per IP per minute. Low is safer, but everyone behind
   * one office NAT shares the bucket, so it is a setting rather than a constant.
   */
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(5),
});

export type Env = z.infer<typeof envSchema>;
