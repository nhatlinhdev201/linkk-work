import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from './common/prisma/prisma.service';
import { RedisService } from './common/redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  async checkHealth() {
    const redisPing = await this.redis.ping();
    const tenantCount = await this.prisma.tenant.count();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          connected: true,
          tenantCount,
        },
        redis: {
          connected: redisPing === 'PONG',
          response: redisPing,
        },
      },
    };
  }
}
