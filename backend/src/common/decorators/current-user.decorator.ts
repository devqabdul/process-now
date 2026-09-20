import {
  createParamDecorator,
  type ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../types/auth-user.js';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<Request & { user: AuthUser }>().user,
);

/** The logged-in admin's company. Never read companyId from the body, query or URL. */
export const CompanyId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const { user } = ctx
      .switchToHttp()
      .getRequest<Request & { user: AuthUser }>();
    if (!user.companyId) throw new ForbiddenException();
    return user.companyId;
  },
);
