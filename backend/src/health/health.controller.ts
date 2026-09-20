import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Two endpoints, because orchestrators use them differently: liveness answers
 * "is the process up?" and must not touch the database, or a database blip
 * restarts every replica. Readiness answers "can it serve traffic?".
 */
@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      // No detail to the caller: health endpoints are public.
      throw new ServiceUnavailableException('Database unavailable');
    }
    return { status: 'ok' };
  }
}
