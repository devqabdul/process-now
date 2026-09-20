import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { parseIdentifier } from '../common/identifier.js';
import { fieldError } from '../common/validators.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';

const userSelect = {
  id: true,
  name: true,
  role: true,
  // the caller's own row, so the UI needs no second request and sees no catalogue
  roleRef: { select: { label: true, accent: true } },
  isActive: true,
  phone: true,
  email: true,
  tokenVersion: true,
  passwordHash: true,
  company: { select: { id: true, name: true, isActive: true } },
} as const;

/** `roleRef` is the DB relation; the API exposes it as the role's own metadata. */
const toView = <T extends { roleRef: { label: string; accent: string } }>({
  roleRef,
  ...user
}: T) => ({ ...user, roleMeta: roleRef });

// Compared against when the user doesn't exist, so both failures take the same time.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(identifier: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: parseIdentifier(identifier),
      select: userSelect,
    });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) {
      throw new UnauthorizedException('Wrong phone/email or password');
    }
    // Same message either way: a disabled account shouldn't be distinguishable
    // from a wrong password by anyone probing from outside.
    if (!user.isActive || user.company?.isActive === false) {
      throw new UnauthorizedException('Wrong phone/email or password');
    }
    const { passwordHash: _, tokenVersion: __, isActive: ___, ...view } = user;
    return { token: await this.sign(user), user: toView(view) };
  }

  /** Signs the session token; tokenVersion is what makes it revocable. */
  private sign(user: {
    id: string;
    role: string;
    tokenVersion: number;
    company: { id: string } | null;
  }) {
    const payload: AuthUser = {
      userId: user.id,
      role: user.role as AuthUser['role'],
      companyId: user.company?.id ?? null,
      tokenVersion: user.tokenVersion,
    };
    return this.jwt.signAsync(payload);
  }

  /** Invalidates every session of this user. Returns nothing: the cookie is cleared by the caller. */
  async revokeSessions(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  /**
   * Changing a password revokes other sessions, then issues a fresh token so the
   * admin who just changed it isn't logged out of the device they are using.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw fieldError('currentPassword', 'Wrong password');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        tokenVersion: { increment: 1 },
        updatedBy: userId,
      },
      select: userSelect,
    });
    return { token: await this.sign(updated) };
  }

  async me(userId: string) {
    const {
      passwordHash: _,
      tokenVersion: __,
      isActive: ___,
      ...user
    } = userSelect;
    const found = await this.prisma.user.findUnique({
      where: { id: userId },
      select: user,
    });
    if (!found) throw new UnauthorizedException();
    return toView(found);
  }
}
