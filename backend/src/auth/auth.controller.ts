import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { AUTH_COOKIE, SESSION_TTL_SECONDS } from '../common/auth.constants.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import type { Env } from '../config/env.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto, LoginDto } from './dto/login.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookie: CookieOptions;

  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
  ) {
    // SameSite=Lax requires the PWA and the API to share a registrable domain
    // (app.example.com + api.example.com). See README > Hosting.
    this.cookie = {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.get('NODE_ENV', { infer: true }) === 'production',
      path: '/',
    };
  }

  private setSession(res: Response, token: string) {
    res.cookie(AUTH_COOKIE, token, {
      ...this.cookie,
      maxAge: SESSION_TTL_SECONDS * 1000,
    });
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  // Decorators are evaluated before DI exists, so this is the one place that reads
  // process.env directly. ConfigModule writes the validated value back to it at boot.
  @Throttle({
    default: {
      limit: () => Number(process.env.LOGIN_RATE_LIMIT ?? 5),
      ttl: 60_000,
    },
  })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.auth.login(dto.identifier, dto.password);
    this.setSession(res, token);
    return { user };
  }

  /**
   * Public so a user holding an expired or already-revoked cookie can still
   * clear it; a valid cookie additionally revokes the session server-side.
   */
  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string | undefined>)[
      AUTH_COOKIE
    ];
    if (token) {
      try {
        const { userId } = await this.jwt.verifyAsync<AuthUser>(token);
        await this.auth.revokeSessions(userId);
      } catch {
        // expired or forged: clearing the cookie is all that's left to do
      }
    }
    res.clearCookie(AUTH_COOKIE, this.cookie);
    return { loggedOut: true };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return { user: await this.auth.me(user.userId) };
  }

  /** Revokes every other session and refreshes this one. */
  @Patch('password')
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token } = await this.auth.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
    this.setSession(res, token);
    return { changed: true };
  }
}
