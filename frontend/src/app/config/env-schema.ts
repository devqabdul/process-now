import { z } from 'zod';

export const envSchema = z
  .object({
    VITE_API_BASE_URL: z.url(),
    VITE_APP_ENV: z.enum(['local', 'development', 'staging', 'production']),
    // Optional: where Web Vitals are posted. Unset means nothing is sent.
    VITE_VITALS_URL: z.union([z.url(), z.literal('')]).optional(),
  })
  // Passwords go over this URL: only localhost may be plaintext.
  .refine((env) => env.VITE_APP_ENV === 'local' || env.VITE_API_BASE_URL.startsWith('https://'), {
    error: 'VITE_API_BASE_URL must use https outside local development',
    path: ['VITE_API_BASE_URL'],
  });

export type Env = z.infer<typeof envSchema>;

export const parseEnv = (raw: Record<string, unknown>): Env => {
  const result = envSchema.safeParse(raw);
  if (result.success) return result.data;
  const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment variables:\n${issues}`);
};
