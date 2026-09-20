import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Roles } from '../decorators/roles.decorator.js';
import type { AuthUser } from '../types/auth-user.js';

/** Global: enforces @Roles(...) on the handler or controller. No @Roles = any logged-in user. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride(Roles, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles?.length) return true;
    const { user } = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    return !!user && roles.includes(user.role);
  }
}
