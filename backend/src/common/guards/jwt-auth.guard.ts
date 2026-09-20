import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AUTH_COOKIE } from '../auth.constants.js';
import { IS_PUBLIC } from '../decorators/public.decorator.js';
import type { AuthUser } from '../types/auth-user.js';

/** Global: every route needs a valid session cookie unless marked @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user: AuthUser }>();
    const token = (req.cookies as Record<string, string | undefined>)[
      AUTH_COOKIE
    ];
    if (!token) throw new UnauthorizedException();
    let payload: AuthUser;
    try {
      payload = await this.jwt.verifyAsync<AuthUser>(token);
    } catch {
      throw new UnauthorizedException();
    }
    // One indexed lookup per request buys revocation: logout, a password change
    // or a deleted user takes effect immediately instead of in 24 hours.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        role: true,
        companyId: true,
        tokenVersion: true,
        isActive: true,
        company: { select: { isActive: true } },
      },
    });
    // Deactivating a user or suspending a company ends their sessions on the
    // next request, not whenever the token happens to expire.
    if (
      !user ||
      user.tokenVersion !== payload.tokenVersion ||
      !user.isActive ||
      user.company?.isActive === false
    ) {
      throw new UnauthorizedException();
    }
    req.user = {
      userId: payload.userId,
      role: user.role as AuthUser['role'],
      companyId: user.companyId,
      tokenVersion: user.tokenVersion,
    };
    return true;
  }
}
