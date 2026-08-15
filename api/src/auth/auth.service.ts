import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';

import { loadEnv } from '../config/env';
import { DATABASE } from '../db/database.tokens';
import type { Database } from '../db/database.module';
import { otpChallenges, refreshTokens } from '../db/schema';
import { SMS_PROVIDER, type SmsProvider } from '../sms/sms.provider';
import { UsersService } from '../users/users.service';
import {
  generateOtp,
  generateRefreshToken,
  hashesMatch,
  hmacSha256,
} from './crypto';
import { signHs256Jwt, verifyHs256Jwt } from './jwt';
import { normalizeUaPhone } from './phone';

export type AccessPayload = {
  sub: string;
  roles: Array<'customer' | 'driver' | 'admin'>;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Inject(UsersService) private readonly users: UsersService,
  ) {}

  async requestOtp(rawPhone: string): Promise<{
    sent: true;
    expiresIn: number;
    devCode?: string;
  }> {
    const env = loadEnv();
    const phone = this.requireUaPhone(rawPhone);
    await this.enforceRequestRateLimit(phone, env.OTP_REQUEST_WINDOW_SECONDS, env.OTP_REQUEST_MAX);

    const code = generateOtp(env.OTP_LENGTH);
    const expiresAt = new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);

    await this.db
      .update(otpChallenges)
      .set({ consumedAt: new Date() })
      .where(and(eq(otpChallenges.phone, phone), isNull(otpChallenges.consumedAt)));

    await this.db.insert(otpChallenges).values({
      phone,
      codeHash: hmacSha256(code, env.JWT_SECRET),
      expiresAt,
    });
    await this.sms.sendOtp(phone, code);

    return {
      sent: true,
      expiresIn: env.OTP_TTL_SECONDS,
      ...(env.NODE_ENV === 'production' ? {} : { devCode: code }),
    };
  }

  async verifyOtp(rawPhone: string, code: string): Promise<TokenPair> {
    const env = loadEnv();
    const phone = this.requireUaPhone(rawPhone);
    const [challenge] = await this.db
      .select()
      .from(otpChallenges)
      .where(and(eq(otpChallenges.phone, phone), isNull(otpChallenges.consumedAt)))
      .orderBy(desc(otpChallenges.createdAt))
      .limit(1);

    if (!challenge) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    if (challenge.attemptCount >= env.OTP_MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many verification attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const matches = hashesMatch(
      challenge.codeHash,
      hmacSha256(code.trim(), env.JWT_SECRET),
    );

    if (!matches) {
      await this.db
        .update(otpChallenges)
        .set({ attemptCount: challenge.attemptCount + 1 })
        .where(eq(otpChallenges.id, challenge.id));

      if (challenge.attemptCount + 1 >= env.OTP_MAX_ATTEMPTS) {
        throw new HttpException(
          'Too many verification attempts',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new UnauthorizedException('Invalid or expired code');
    }

    await this.db
      .update(otpChallenges)
      .set({ consumedAt: new Date() })
      .where(eq(otpChallenges.id, challenge.id));

    const existing = await this.users.findByPhone(phone);
    const user = existing ?? (await this.users.createCustomer(phone));
    const roles = await this.users.getRoles(user.id);
    return this.issueTokens(user.id, roles);
  }

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const env = loadEnv();
    const tokenHash = hmacSha256(rawRefreshToken, env.JWT_SECRET);
    const [stored] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, stored.id));

    const roles = await this.users.getRoles(stored.userId);
    return this.issueTokens(stored.userId, roles);
  }

  async logout(userId: string, rawRefreshToken: string): Promise<void> {
    const env = loadEnv();
    const tokenHash = hmacSha256(rawRefreshToken, env.JWT_SECRET);
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.tokenHash, tokenHash),
        ),
      );
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    const roles = await this.users.getRoles(user.id);
    return {
      id: user.id,
      phone: user.phone,
      roles,
      canUseDriverMode: roles.includes('driver'),
    };
  }

  async verifyAccess(token: string): Promise<AccessPayload> {
    const env = loadEnv();
    try {
      const payload = verifyHs256Jwt(token, env.JWT_SECRET);
      return {
        sub: payload.sub,
        roles: payload.roles,
      };
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async issueTokens(
    userId: string,
    roles: AccessPayload['roles'],
  ): Promise<TokenPair> {
    const env = loadEnv();
    const accessToken = signHs256Jwt(
      { sub: userId, roles },
      env.JWT_SECRET,
      env.ACCESS_TOKEN_TTL_SECONDS,
    );

    const refreshToken = generateRefreshToken();
    await this.db.insert(refreshTokens).values({
      userId,
      tokenHash: hmacSha256(refreshToken, env.JWT_SECRET),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000),
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  private requireUaPhone(rawPhone: string): string {
    const phone = normalizeUaPhone(rawPhone);
    if (!phone) {
      throw new BadRequestException('Only Ukrainian +380 numbers are allowed');
    }
    return phone;
  }

  private async enforceRequestRateLimit(
    phone: string,
    windowSeconds: number,
    max: number,
  ): Promise<void> {
    const windowStart = new Date(Date.now() - windowSeconds * 1000);
    const recent = await this.db
      .select({ id: otpChallenges.id })
      .from(otpChallenges)
      .where(
        and(
          eq(otpChallenges.phone, phone),
          gt(otpChallenges.createdAt, windowStart),
        ),
      );

    if (recent.length >= max) {
      throw new HttpException('OTP request limit reached', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
