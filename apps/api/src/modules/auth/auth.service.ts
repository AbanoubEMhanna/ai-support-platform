import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

type Tokens = { accessToken: string; refreshToken: string };

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private accessSecret() {
    return this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  private refreshSecret() {
    return this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  private sha256(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private async signTokens(payload: {
    sub: string;
    email: string;
    orgId?: string;
    role?: 'OWNER' | 'ADMIN' | 'MEMBER';
  }): Promise<Tokens> {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.accessSecret(),
      expiresIn: '15m',
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.refreshSecret(),
      expiresIn: '30d',
    });

    return { accessToken, refreshToken };
  }

  async register(input: { email: string; password: string; name?: string }) {
    const passwordHash = await argon2.hash(input.password);

    const user = await this.prisma.user.create({
      data: { email: input.email, passwordHash, name: input.name },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const tokens = await this.signTokens({ sub: user.id, email: user.email });
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  async login(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user) throw new ForbiddenException('Invalid credentials');

    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) throw new ForbiddenException('Invalid credentials');

    const membership = await this.prisma.membership.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const tokens = await this.signTokens({
      sub: user.id,
      email: user.email,
      orgId: membership?.organizationId,
      role: membership?.role as 'OWNER' | 'ADMIN' | 'MEMBER' | undefined,
    });

    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      tokens,
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const tokenHashSha256 = this.sha256(refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHashSha256 },
    });
    if (!stored || stored.userId !== userId) {
      throw new ForbiddenException('Invalid refresh token');
    }
    if (stored.revokedAt || stored.expiresAt.getTime() <= Date.now()) {
      throw new ForbiddenException('Invalid refresh token');
    }

    const ok = await argon2.verify(stored.tokenHash, refreshToken);
    if (!ok) {
      throw new ForbiddenException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) throw new ForbiddenException('Invalid refresh token');

    const membership = await this.prisma.membership.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const tokens = await this.signTokens({
      sub: user.id,
      email: user.email,
      orgId: membership?.organizationId,
      role: membership?.role as 'OWNER' | 'ADMIN' | 'MEMBER' | undefined,
    });
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async refreshFromJwt(refreshToken: string) {
    const payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
      secret: this.refreshSecret(),
    });
    return this.refresh(payload.sub, refreshToken);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async issueTokensForOrg(userId: string, organizationId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) throw new ForbiddenException('Invalid user');

    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) throw new ForbiddenException('Not a member');

    const tokens = await this.signTokens({
      sub: user.id,
      email: user.email,
      orgId: membership.organizationId,
      role: membership.role as 'OWNER' | 'ADMIN' | 'MEMBER',
    });
    await this.persistRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  private async persistRefreshToken(userId: string, refreshToken: string) {
    const tokenHash = await argon2.hash(refreshToken);
    const tokenHashSha256 = this.sha256(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, tokenHashSha256, expiresAt },
    });
  }
}
