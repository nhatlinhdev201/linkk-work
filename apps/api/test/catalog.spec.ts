import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { ServicePricingType, UserRole } from '@linkkwork/shared-types';

describe('Catalog Module E2E / Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let partnerAdminToken: string;
  let partnerTenantId: string;
  let cleaningCategoryId: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    prisma = moduleRef.get<PrismaService>(PrismaService);

    // Login Super Admin
    const superAdminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@linkkwork.vn',
        password: 'Admin@123456',
      });
    superAdminToken = superAdminRes.body.accessToken;

    // Login Partner Admin
    const partnerAdminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@anhduong.vn',
        password: 'Partner@123456',
      });
    partnerAdminToken = partnerAdminRes.body.accessToken;
    partnerTenantId = partnerAdminRes.body.user.tenantId;

    // Ensure category exists
    const category = await prisma.category.findFirst({
      where: { slug: 'don-dep-ve-sinh' },
    });
    cleaningCategoryId = category!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/catalog/categories', () => {
    it('should return categories publicly without auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/catalog/categories')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const cat = res.body.find((c: { slug: string }) => c.slug === 'don-dep-ve-sinh');
      expect(cat).toBeDefined();
    });
  });

  describe('POST /api/v1/catalog/categories', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/catalog/categories')
        .send({ name: 'Chăm sóc thú cưng' })
        .expect(401);
    });

    it('should reject non-superadmin request with 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/catalog/categories')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ name: 'Chăm sóc thú cưng' })
        .expect(403);
    });

    it('should create a new category when called by Super Admin', async () => {
      const uniqueName = `Danh Mục Test ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/catalog/categories')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: uniqueName,
          icon: 'heart',
          displayOrder: 10,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe(uniqueName);
      expect(res.body.slug).toContain('danh-muc-test');
    });
  });

  describe('GET /api/v1/catalog/services', () => {
    it('should return services for Super Admin (including platform services)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/catalog/services')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].category).toBeDefined();
    });

    it('should return services for Tenant Admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/catalog/services')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /api/v1/catalog/services and PATCH toggle', () => {
    let createdServiceId: string;
    let partnerServiceId: string;

    it('should create a platform-wide service by Super Admin', async () => {
      const uniqueName = `Dịch Vụ Nền Tảng ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/catalog/services')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: uniqueName,
          categoryId: cleaningCategoryId,
          pricingType: ServicePricingType.HOURLY,
          baseUnitPrice: 95000,
          durationHours: 2,
          description: 'Mô tả dịch vụ nền tảng',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe(uniqueName);
      expect(res.body.tenantId).toBeNull();
      createdServiceId = res.body.id;
    });

    it('should create a tenant-specific service by Partner Admin', async () => {
      const uniqueName = `Dịch Vụ Ánh Dương ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/catalog/services')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({
          name: uniqueName,
          categoryId: cleaningCategoryId,
          pricingType: ServicePricingType.PER_UNIT,
          baseUnitPrice: 200000,
          description: 'Mô tả dịch vụ riêng Ánh Dương',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe(uniqueName);
      expect(res.body.tenantId).toBe(partnerTenantId);
      partnerServiceId = res.body.id;
    });

    it('should fetch service details via GET /api/v1/catalog/services/:id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/catalog/services/${createdServiceId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdServiceId);
      expect(res.body.category).toBeDefined();
    });

    it('should forbid Partner Admin from toggling platform service', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/catalog/services/${createdServiceId}/toggle`)
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({})
        .expect(403);
    });

    it('should allow Super Admin to toggle platform service', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/catalog/services/${createdServiceId}/toggle`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({})
        .expect(200);

      expect(res.body.isActive).toBe(false);
    });

    it('should allow Partner Admin to toggle their own service', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/catalog/services/${partnerServiceId}/toggle`)
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(res.body.isActive).toBe(false);
    });
  });

  describe('POST /api/v1/catalog/calculate-price', () => {
    it('should calculate price correctly without requiring auth', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/catalog/calculate-price')
        .send({
          pricingType: ServicePricingType.HOURLY,
          baseUnitPrice: 100000,
          durationHours: 3,
          areaSurcharge: 20000,
          addonsPrice: 30000,
          surgeMultiplier: 1.2,
          discountAmount: 40000,
        })
        .expect(201);

      // baseTotal: 3 * 100,000 = 300,000
      // subtotal: 300,000 + 20,000 + 30,000 = 350,000
      // surgeAmount: round(350,000 * 0.2) = 70,000
      // preDiscount: 420,000
      // discount: 40,000
      // finalTotal: 380,000
      expect(res.body.baseTotal).toBe(300000);
      expect(res.body.subtotal).toBe(350000);
      expect(res.body.surgeMultiplier).toBe(1.2);
      expect(res.body.surgeAmount).toBe(70000);
      expect(res.body.discountAmount).toBe(40000);
      expect(res.body.finalTotal).toBe(380000);
    });

    it('should reject invalid pricingType with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/catalog/calculate-price')
        .send({
          pricingType: 'INVALID_TYPE',
          baseUnitPrice: 100000,
        })
        .expect(400);
    });
  });
});
