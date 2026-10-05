import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const host = this.configService.get<string>('REDIS_HOST', '127.0.0.1');
    const port = Number(this.configService.get<number>('REDIS_PORT', 6379));

    const options: RedisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    };

    if (password) {
      options.password = password;
    }

    if (redisUrl) {
      this.client = new Redis(redisUrl, options);
    } else {
      this.client = new Redis({
        ...options,
        host,
        port,
      });
    }

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`, err.stack);
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Connected to Redis server');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
      this.logger.log('Disconnected from Redis server');
    } catch (error) {
      this.logger.error('Error disconnecting from Redis', error);
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null> {
    if (ttlSeconds !== undefined && ttlSeconds > 0) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  async eval(
    script: string,
    numkeys: number,
    ...args: (string | number)[]
  ): Promise<unknown> {
    return this.client.eval(script, numkeys, ...args);
  }
}
