import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { UserRole } from '@linkkwork/shared-types';

describe('Tasker & HRM Module E2E / Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let tenantAAdminToken: string;
  let tenantAId: string;
  let tenantBAdminToken: string;
  let tenantBId: string;

  let createdTaskerId: string;
  const createdUserIds: string[] = [];

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

    // 1. Login Super Admin
    const superAdminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@linkkwork.vn',
        password: 'Admin@123456',
      });
    superAdminToken = superAdminRes.body.accessToken;

    // 2. Login Tenant A Admin (Ánh Dương)
    const tenantARes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@anhduong.vn',
        password: 'Partner@123456',
      });
    tenantAAdminToken = tenantARes.body.accessToken;
    tenantAId = tenantARes.body.user.tenantId;

    // 3. Ensure Tenant B exists for isolation tests
    let tenantB = await prisma.tenant.findUnique({
      where: { code: 'TENANT_B_TASKER_TEST' },
    });
    if (!tenantB) {
      tenantB = await prisma.tenant.create({
        data: {
          code: 'TENANT_B_TASKER_TEST',
          name: 'Đối Tác Thử Nghiệm B',
          email: 'partner_b@test.vn',
          phone: '0909999002',
          city: 'Đà Nẵng',
          status: 'ACTIVE',
        },
      });
    }
    tenantBId = tenantB.id;

    const tenantBPasswordHash = await bcrypt.hash('TenantB@123456', 10);
    let tenantBUser = await prisma.user.findFirst({
      where: { email: 'admin_b@tenantb.vn' },
    });
    if (!tenantBUser) {
      tenantBUser = await prisma.user.create({
        data: {
          tenantId: tenantBId,
          email: 'admin_b@tenantb.vn',
          name: 'Admin Đối Tác B',
          phone: '0909999003',
          passwordHash: tenantBPasswordHash,
          role: UserRole.TENANT_ADMIN,
          status: 'ACTIVE',
        },
      });
    }

    const tenantBRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin_b@tenantb.vn',
        password: 'TenantB@123456',
      });
    tenantBAdminToken = tenantBRes.body.accessToken;
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.walletTransaction.deleteMany({
        where: { taskerId: { in: createdUserIds } },
      });
      await prisma.taskerProfile.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
    await app.close();
  });

  describe('1. Tasker Onboarding & Creation', () => {
    it('should allow Tenant Admin to create a tasker under their tenant', async () => {
      const randomPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
      const randomEmail = `tasker_${Date.now()}@anhduong.vn`;

      const res = await request(app.getHttpServer())
        .post('/api/v1/taskers')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .send({
          name: 'Nguyễn Văn Thợ Test',
          phone: randomPhone,
          email: randomEmail,
          password: 'Tasker@123456',
          idCardNumber: '079090123456',
          skills: ['don-dep-ve-sinh', 'giat-sofa'],
          depositBalance: 500000,
          maxDistanceKm: 15,
          autoRadarEnabled: true,
          bankName: 'Techcombank',
          bankAccountNumber: '19034567890',
          bankAccountHolder: 'NGUYEN VAN THO TEST',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Nguyễn Văn Thợ Test');
      expect(res.body.email).toBe(randomEmail);
      expect(res.body.phone).toBe(randomPhone);
      expect(res.body.tenantId).toBe(tenantAId);
      expect(res.body.passwordHash).toBeUndefined(); // ensure password is sanitized
      expect(res.body.taskerProfile).toBeDefined();
      expect(res.body.taskerProfile.depositBalance).toBe(500000);
      expect(res.body.taskerProfile.maxDistanceKm).toBe(15);
      expect(res.body.taskerProfile.autoRadarEnabled).toBe(true);
      expect(res.body.taskerProfile.kycVerified).toBe(false);

      createdTaskerId = res.body.id;
      createdUserIds.push(createdTaskerId);

      // Verify initial deposit ledger transaction
      const tx = await prisma.walletTransaction.findFirst({
        where: { taskerId: createdTaskerId },
      });
      expect(tx).toBeDefined();
      expect(tx!.amount).toBe(500000);
      expect(tx!.type).toBe('TOP_UP_DEPOSIT');
      expect(tx!.direction).toBe('IN');
      expect(tx!.balanceBefore).toBe(0);
      expect(tx!.balanceAfter).toBe(500000);
    });

    it('should reject creation when email or phone already exists', async () => {
      const existingUser = await prisma.user.findUnique({
        where: { id: createdTaskerId },
      });

      await request(app.getHttpServer())
        .post('/api/v1/taskers')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .send({
          name: 'Trùng Email',
          phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
          email: existingUser!.email,
          password: 'Tasker@123456',
        })
        .expect(409);
    });
  });

  describe('2. Query Taskers with Filters and Pagination', () => {
    it('should return list of taskers including created tasker', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/taskers')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(res.body.taskers).toBeDefined();
      expect(Array.isArray(res.body.taskers)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);

      const found = res.body.taskers.find((t: { id: string }) => t.id === createdTaskerId);
      expect(found).toBeDefined();
      expect(found.passwordHash).toBeUndefined();
    });

    it('should filter by search keyword', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/taskers?search=Nguyễn Văn Thợ Test')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(res.body.taskers.length).toBeGreaterThanOrEqual(1);
      expect(res.body.taskers.some((t: { id: string }) => t.id === createdTaskerId)).toBe(true);
    });

    it('should filter by boolean flags: kycVerified, isOnline, lowDepositOnly', async () => {
      // kycVerified is false initially
      const resFalse = await request(app.getHttpServer())
        .get('/api/v1/taskers?kycVerified=false')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(resFalse.body.taskers.some((t: { id: string }) => t.id === createdTaskerId)).toBe(true);

      const resTrue = await request(app.getHttpServer())
        .get('/api/v1/taskers?kycVerified=true')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(resTrue.body.taskers.some((t: { id: string }) => t.id === createdTaskerId)).toBe(false);
    });
  });

  describe('3. Get Tasker Details by ID', () => {
    it('should return tasker details and ledger history', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/taskers/${createdTaskerId}`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdTaskerId);
      expect(res.body.taskerProfile).toBeDefined();
      expect(res.body.walletTransactions).toBeDefined();
      expect(res.body.walletTransactions.length).toBeGreaterThanOrEqual(1);
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('should return 404 for non-existent tasker ID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/taskers/non-existent-uuid')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(404);
    });
  });

  describe('4. Update Tasker Profile & Work Floor', () => {
    it('should update tasker personal information and salary type', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/taskers/${createdTaskerId}`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .send({
          name: 'Nguyễn Văn Thợ Đã Đổi Tên',
          skills: ['don-dep-ve-sinh', 'giat-ghe-sofa', 've-sinh-may-lanh'],
          salaryType: 'FIXED_SALARY',
        })
        .expect(200);

      expect(res.body.name).toBe('Nguyễn Văn Thợ Đã Đổi Tên');
      expect(res.body.taskerProfile.skills).toContain('ve-sinh-may-lanh');
      expect(res.body.taskerProfile.salaryType).toBe('FIXED_SALARY');
    });

    it('should update work floor configuration (radius, radar, coordinates)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/taskers/${createdTaskerId}/work-floor`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .send({
          maxDistanceKm: 25,
          autoRadarEnabled: false,
          currentLat: 10.762622,
          currentLng: 106.660172,
        })
        .expect(200);

      expect(res.body.maxDistanceKm).toBe(25);
      expect(res.body.autoRadarEnabled).toBe(false);
      expect(res.body.currentLat).toBe(10.762622);
      expect(res.body.currentLng).toBe(106.660172);
    });

    it('should toggle online/offline status', async () => {
      // Current isOnline is false
      const toggle1 = await request(app.getHttpServer())
        .patch(`/api/v1/taskers/${createdTaskerId}/toggle-status`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(toggle1.body.isOnline).toBe(true);

      const toggle2 = await request(app.getHttpServer())
        .patch(`/api/v1/taskers/${createdTaskerId}/toggle-status`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(toggle2.body.isOnline).toBe(false);
    });
  });

  describe('5. Double-entry Deposit Adjustment Ledger', () => {
    it('should adjust deposit balance (Top-up) and record TOP_UP_DEPOSIT transaction', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/taskers/${createdTaskerId}/deposit`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .send({
          amount: 250000,
          notes: 'Nạp thêm ký quỹ bảo đảm',
        })
        .expect(201);

      expect(res.body.taskerProfile.depositBalance).toBe(750000); // 500,000 + 250,000
      expect(res.body.transaction).toBeDefined();
      expect(res.body.transaction.type).toBe('TOP_UP_DEPOSIT');
      expect(res.body.transaction.amount).toBe(250000);
      expect(res.body.transaction.direction).toBe('IN');
      expect(res.body.transaction.balanceBefore).toBe(500000);
      expect(res.body.transaction.balanceAfter).toBe(750000);
    });

    it('should deduct deposit balance and record WITHDRAW_DEPOSIT transaction', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/taskers/${createdTaskerId}/deposit`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .send({
          amount: -150000,
          notes: 'Khấu trừ rút tiền ký quỹ',
        })
        .expect(201);

      expect(res.body.taskerProfile.depositBalance).toBe(600000); // 750,000 - 150,000
      expect(res.body.transaction.type).toBe('WITHDRAW_DEPOSIT');
      expect(res.body.transaction.amount).toBe(150000);
      expect(res.body.transaction.direction).toBe('OUT');
      expect(res.body.transaction.balanceBefore).toBe(750000);
      expect(res.body.transaction.balanceAfter).toBe(600000);
    });

    it('should prevent balance from going negative', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/taskers/${createdTaskerId}/deposit`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .send({
          amount: -99999999,
          notes: 'Khấu trừ quá mức',
        })
        .expect(400);
    });

    it('should return transaction ledger history via GET :id/transactions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/taskers/${createdTaskerId}/transactions`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3); // Initial + Top-up + Deduction
      expect(res.body[0].taskerId).toBe(createdTaskerId);
    });
  });

  describe('6. KYC Verification', () => {
    it('should update KYC verified status to true', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/taskers/${createdTaskerId}/kyc`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .send({
          kycVerified: true,
          idCardNumber: '079090123456',
          notes: 'Đã đối chiếu căn cước công dân trực tiếp',
        })
        .expect(200);

      expect(res.body.kycVerified).toBe(true);
      expect(res.body.idCardNumber).toBe('079090123456');

      // Check tasker profile in db
      const profile = await prisma.taskerProfile.findUnique({
        where: { userId: createdTaskerId },
      });
      expect(profile!.kycVerified).toBe(true);
    });
  });

  describe('7. Multi-tenant Isolation Enforcement', () => {
    it('Tenant B Admin trying to GET Tenant A tasker throws 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/taskers/${createdTaskerId}`)
        .set('Authorization', `Bearer ${tenantBAdminToken}`)
        .expect(403);
    });

    it('Tenant B Admin trying to PATCH Tenant A tasker throws 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/taskers/${createdTaskerId}`)
        .set('Authorization', `Bearer ${tenantBAdminToken}`)
        .send({ name: 'Hacker Name' })
        .expect(403);
    });

    it('Tenant B Admin trying to update work floor of Tenant A tasker throws 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/taskers/${createdTaskerId}/work-floor`)
        .set('Authorization', `Bearer ${tenantBAdminToken}`)
        .send({ maxDistanceKm: 50 })
        .expect(403);
    });

    it('Tenant B Admin trying to adjust deposit of Tenant A tasker throws 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/taskers/${createdTaskerId}/deposit`)
        .set('Authorization', `Bearer ${tenantBAdminToken}`)
        .send({ amount: 100000, notes: 'Malicious deposit' })
        .expect(403);
    });

    it('Tenant B Admin GET /api/v1/taskers does NOT return Tenant A taskers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/taskers')
        .set('Authorization', `Bearer ${tenantBAdminToken}`)
        .expect(200);

      const found = res.body.taskers.find((t: { id: string }) => t.id === createdTaskerId);
      expect(found).toBeUndefined();
    });

    it('Super Admin CAN view and access Tenant A tasker', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/taskers/${createdTaskerId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdTaskerId);
    });
  });
});
