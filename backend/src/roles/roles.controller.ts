import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * The role catalogue, for the console that assigns them. A company admin gets
 * its own role's label and accent from /auth/me instead, and has no business
 * knowing which other roles exist.
 */
@ApiTags('roles')
@Roles(['super_admin'])
@Controller('roles')
export class RolesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.role.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        key: true,
        label: true,
        description: true,
        accent: true,
        sortOrder: true,
      },
    });
  }
}
