import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaModule } from '../src/common/prisma/prisma.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisModule } from '../src/common/redis/redis.module';
import { RedisService } from '../src/common/redis/redis.service';

describe('Database and Redis Integration Tests', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        PrismaModule,
        RedisModule,
      ],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);
    redis = moduleRef.get<RedisService>(RedisService);

    // Initialize module lifecycle
    await moduleRef.init();
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  describe('PostgreSQL with Prisma ORM', () => {
    it('should retrieve seeded platform tenant', async () => {
      const platformTenant = await prisma.tenant.findUnique({
        where: { code: 'TENANT_LINKKWORK' },
      });

      expect(platformTenant).toBeDefined();
      expect(platformTenant?.name).toBe('LinkkWork Platform');
      expect(platformTenant?.isDefault).toBe(true);
      expect(platformTenant?.status).toBe('ACTIVE');
    });

    it('should retrieve seeded partner tenant', async () => {
      const partnerTenant = await prisma.tenant.findUnique({
        where: { code: 'TENANT_ANH_DUONG' },
      });

      expect(partnerTenant).toBeDefined();
      expect(partnerTenant?.name).toBe('Công ty Vệ Sinh Ánh Dương');
      expect(partnerTenant?.isDefault).toBe(false);
      expect(partnerTenant?.status).toBe('ACTIVE');
    });

    it('should retrieve seeded super admin and verify credentials hash', async () => {
      const superAdmin = await prisma.user.findUnique({
        where: { email: 'admin@linkkwork.vn' },
      });

      expect(superAdmin).toBeDefined();
      expect(superAdmin?.name).toBe('Super Admin');
      expect(superAdmin?.role).toBe('SUPER_ADMIN');
      expect(superAdmin?.isSuperAdmin).toBe(true);

      const isValidPassword = await bcrypt.compare(
        'Admin@123456',
        superAdmin!.passwordHash,
      );
      expect(isValidPassword).toBe(true);
    });

    it('should retrieve seeded partner admin', async () => {
      const partnerAdmin = await prisma.user.findUnique({
        where: { email: 'admin@anhduong.vn' },
        include: { tenant: true },
      });

      expect(partnerAdmin).toBeDefined();
      expect(partnerAdmin?.role).toBe('TENANT_ADMIN');
      expect(partnerAdmin?.tenant?.code).toBe('TENANT_ANH_DUONG');

      const isValidPassword = await bcrypt.compare(
        'Partner@123456',
        partnerAdmin!.passwordHash,
      );
      expect(isValidPassword).toBe(true);
    });

    it('should retrieve seeded categories and services', async () => {
      const categories = await prisma.category.findMany({
        orderBy: { displayOrder: 'asc' },
      });
      expect(categories.length).toBeGreaterThanOrEqual(3);

      const services = await prisma.service.findMany({
        include: { category: true },
      });
      expect(services.length).toBeGreaterThanOrEqual(2);

      const hourlyService = services.find((s) => s.slug === 'don-dep-nha-theo-gio');
      expect(hourlyService).toBeDefined();
      expect(hourlyService?.pricingType).toBe('HOURLY');
      expect(hourlyService?.baseUnitPrice).toBe(80000);

      const perUnitService = services.find((s) => s.slug === 've-sinh-may-lanh');
      expect(perUnitService).toBeDefined();
      expect(perUnitService?.pricingType).toBe('PER_UNIT');
      expect(perUnitService?.baseUnitPrice).toBe(150000);
    });
  });

  describe('Redis Module & Service', () => {
    it('should ping Redis server successfully', async () => {
      const pong = await redis.ping();
      expect(pong).toBe('PONG');
    });

    it('should set, get and del values in Redis', async () => {
      const testKey = 'test:linkkwork:healthcheck';
      const testValue = JSON.stringify({ ok: true, timestamp: Date.now() });

      // Test set
      const setResult = await redis.set(testKey, testValue, 30);
      expect(setResult).toBe('OK');

      // Test get
      const retrieved = await redis.get(testKey);
      expect(retrieved).toBe(testValue);

      // Test del
      const delCount = await redis.del(testKey);
      expect(delCount).toBe(1);

      // Verify deletion
      const afterDel = await redis.get(testKey);
      expect(afterDel).toBeNull();
    });

    it('should execute eval lua script on Redis', async () => {
      const luaScript = 'return ARGV[1]';
      const result = await redis.eval(luaScript, 0, 'linkkwork_eval_test');
      expect(result).toBe('linkkwork_eval_test');
    });
  });
});
