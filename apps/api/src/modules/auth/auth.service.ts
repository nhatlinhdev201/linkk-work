import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, UserRole } from '@linkkwork/shared-types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: Record<string, unknown>;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly refreshTokenTtlSeconds = 7 * 24 * 60 * 60; // 7 days

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>(
      'JWT_SECRET',
      'linkkwork_super_secret_jwt_key_2026',
    );
    this.jwtRefreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'linkkwork_refresh_secret_key_2026',
    );
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    if (user.tenant && ['SUSPENDED', 'CANCELLED'].includes(user.tenant.status)) {
      throw new UnauthorizedException(`Tenant account is ${user.tenant.status.toLowerCase()}`);
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      tenantId: user.tenantId ?? undefined,
      isSuperAdmin: user.isSuperAdmin,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.jwtSecret,
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        tokenType: 'refresh',
        jti: crypto.randomUUID(),
      },
      {
        secret: this.jwtRefreshSecret,
        expiresIn: '7d',
      },
    );

    const tokenHash = this.hashToken(refreshToken);

    // Save refresh token in DB
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + this.refreshTokenTtlSeconds * 1000),
        isRevoked: false,
      },
    });

    // Save refresh token in Redis with 7-day TTL
    const redisKey = `refresh_token:${user.id}:${tokenHash}`;
    await this.redisService.set(redisKey, 'valid', this.refreshTokenTtlSeconds);

    const { passwordHash: _, ...sanitizedUser } = user;

    return {
      accessToken,
      refreshToken,
      user: sanitizedUser,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string; tokenType?: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const userId = payload.sub;
    if (!userId) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const tokenHash = this.hashToken(refreshToken);
    const redisKey = `refresh_token:${userId}:${tokenHash}`;

    const redisVal = await this.redisService.get(redisKey);
    const dbToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    // Atomic conditional invalidation
    const updateResult = await this.prisma.refreshToken.updateMany({
      where: { tokenHash, isRevoked: false },
      data: { isRevoked: true },
    });
    await this.redisService.del(redisKey);

    if (updateResult.count === 0 || !redisVal || !dbToken || dbToken.expiresAt < new Date()) {
      if (dbToken?.isRevoked) {
        // Suspected replay attack: invalidate all active tokens for this user
        await this.prisma.refreshToken.updateMany({
          where: { userId },
          data: { isRevoked: true },
        });
      }
      throw new UnauthorizedException('Refresh token is revoked or expired');
    }

    // Verify user exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is invalid or inactive');
    }

    if (user.tenant && ['SUSPENDED', 'CANCELLED'].includes(user.tenant.status)) {
      throw new UnauthorizedException(`Tenant account is ${user.tenant.status.toLowerCase()}`);
    }

    // Generate new tokens
    const newPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      tenantId: user.tenantId ?? undefined,
      isSuperAdmin: user.isSuperAdmin,
    };

    const newAccessToken = await this.jwtService.signAsync(newPayload, {
      secret: this.jwtSecret,
      expiresIn: '15m',
    });

    const newRefreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        tokenType: 'refresh',
        jti: crypto.randomUUID(),
      },
      {
        secret: this.jwtRefreshSecret,
        expiresIn: '7d',
      },
    );

    const newTokenHash = this.hashToken(newRefreshToken);

    // Save new refresh token in DB
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + this.refreshTokenTtlSeconds * 1000),
        isRevoked: false,
      },
    });

    // Save new refresh token in Redis
    const newRedisKey = `refresh_token:${user.id}:${newTokenHash}`;
    await this.redisService.set(newRedisKey, 'valid', this.refreshTokenTtlSeconds);

    const { passwordHash: _, ...sanitizedUser } = user;

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: sanitizedUser,
    };
  }

  async logout(userId: string, refreshToken?: string): Promise<{ message: string }> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, userId },
        data: { isRevoked: true },
      });
      await this.redisService.del(`refresh_token:${userId}:${tokenHash}`);
    } else {
      const activeTokens = await this.prisma.refreshToken.findMany({
        where: { userId, isRevoked: false },
        select: { tokenHash: true },
      });

      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });

      if (activeTokens.length > 0) {
        const redisKeys = activeTokens.map(
          (t) => `refresh_token:${userId}:${t.tokenHash}`,
        );
        await this.redisService.del(...redisKeys);
      }
    }

    return { message: 'Logged out successfully' };
  }

  async getCurrentUser(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
        taskerProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive');
    }

    if (user.tenant && ['SUSPENDED', 'CANCELLED'].includes(user.tenant.status)) {
      throw new UnauthorizedException(`Tenant account is ${user.tenant.status.toLowerCase()}`);
    }

    const { passwordHash: _, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}
