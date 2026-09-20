import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

const STARTUP_ATTEMPTS = 3;
const STARTUP_BACKOFF_MS = 2_000;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
        max: config.get('DB_POOL_MAX', { infer: true }),
        // Without this, a request that finds the pool exhausted waits forever:
        // no error, no log, just a hanging client.
        connectionTimeoutMillis: 5_000,
        // A runaway query can't hold a connection indefinitely.
        statement_timeout: 15_000,
      }),
    });
  }

  /**
   * The pg adapter connects lazily, so this query is what makes a bad
   * DATABASE_URL fail at boot. Retried first: a Supabase restart is seconds
   * long, and exiting immediately turns a blip into a failed deploy.
   */
  async onModuleInit() {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.$queryRaw`SELECT 1`;
        return;
      } catch (error) {
        if (attempt === STARTUP_ATTEMPTS) throw error;
        this.logger.warn(
          `Database unreachable (attempt ${attempt}/${STARTUP_ATTEMPTS}), retrying`,
        );
        await new Promise((r) => setTimeout(r, STARTUP_BACKOFF_MS * attempt));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
