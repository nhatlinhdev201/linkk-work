import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  BookingStatus,
  PaymentMethod,
  ServicePricingType,
  UserRole,
  WalletTransactionType,
} from '@prisma/client';

describe('Finance & Universal Ledger Module Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let tenantAAdminToken: string;
  let tenantAId: string;
  let tenantBAdminToken: string;
  let tenantBId: string;

  let taskerAId: string;
  let taskerBId: string;
  let bookingAId: string;
  let bookingBId: string;

  const testTxCodes = [
    `TX-FIN-CASH-A-${Date.now()}`,
    `TX-FIN-COMM-A-${Date.now()}`,
    `TX-FIN-TOPUP-A-${Date.now()}`,
    `TX-FIN-CASH-B-${Date.now()}`,
    `TX-FIN-COMM-B-${Date.now()}`,
  ];
  const testBookingCodes = [
    `BK-FIN-A-${Date.now()}`,
    `BK-FIN-A2-${Date.now()}`,
    `BK-FIN-B-${Date.now()}`,
  ];
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

    // 3. Ensure Tenant B exists
    let tenantB = await prisma.tenant.findUnique({
      where: { code: 'TENANT_B_FINANCE_TEST' },
    });
    if (!tenantB) {
      tenantB = await prisma.tenant.create({
        data: {
          code: 'TENANT_B_FINANCE_TEST',
          name: 'Đối Tác Kế Toán B',
          email: 'partner_b_fin@test.vn',
          phone: '0908888002',
          city: 'Đà Nẵng',
          status: 'ACTIVE',
        },
      });
    }
    tenantBId = tenantB.id;

    const tenantBPasswordHash = await bcrypt.hash('TenantB@123456', 10);
    let tenantBUser = await prisma.user.findFirst({
      where: { email: 'admin_b_fin@tenantb.vn' },
    });
    if (!tenantBUser) {
      tenantBUser = await prisma.user.create({
        data: {
          tenantId: tenantBId,
          email: 'admin_b_fin@tenantb.vn',
          name: 'Admin Kế Toán B',
          phone: '0908888003',
          passwordHash: tenantBPasswordHash,
          role: UserRole.TENANT_ADMIN,
          status: 'ACTIVE',
        },
      });
      createdUserIds.push(tenantBUser.id);
    }

    const tenantBRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin_b_fin@tenantb.vn',
        password: 'TenantB@123456',
      });
    tenantBAdminToken = tenantBRes.body.accessToken;

    // 4. Create Tasker A for Tenant A
    const passwordHash = await bcrypt.hash('Tasker@123456', 10);
    const taskerAUser = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `tasker_fin_a_${Date.now()}@anhduong.vn`,
        name: 'Nguyễn Văn Thợ Finance A',
        phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash,
        role: UserRole.TASKER,
        status: 'ACTIVE',
      },
    });
    createdUserIds.push(taskerAUser.id);
    taskerAId = taskerAUser.id;

    await prisma.taskerProfile.create({
      data: {
        userId: taskerAUser.id,
        tenantId: tenantAId,
        depositBalance: 500000,
        skills: ['don-dep-nha'],
      },
    });

    // 5. Create Tasker B for Tenant B
    const taskerBUser = await prisma.user.create({
      data: {
        tenantId: tenantBId,
        email: `tasker_fin_b_${Date.now()}@tenantb.vn`,
        name: 'Trần Văn Thợ Finance B',
        phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash,
        role: UserRole.TASKER,
        status: 'ACTIVE',
      },
    });
    createdUserIds.push(taskerBUser.id);
    taskerBId = taskerBUser.id;

    await prisma.taskerProfile.create({
      data: {
        userId: taskerBUser.id,
        tenantId: tenantBId,
        depositBalance: 600000,
        skills: ['sua-dien-nuoc'],
      },
    });

    // 6. Ensure Service exists
    const service = await prisma.service.findFirst({
      where: { isActive: true },
    });
    if (!service) {
      throw new Error('At least one active service must exist in database');
    }

    // 7. Seed Bookings
    const bookingA = await prisma.booking.create({
      data: {
        code: testBookingCodes[0],
        originTenantId: tenantAId,
        servicingTenantId: tenantAId,
        serviceId: service.id,
        assignedTaskerId: taskerAId,
        customerName: 'Khách Hàng Finance A',
        customerPhone: '0911223344',
        addressText: '123 Test Street, Tenant A',
        scheduledAt: new Date(),
        totalAmount: 300000,
        baseUnitPrice: 300000,
        pricingType: ServicePricingType.HOURLY,
        status: BookingStatus.COMPLETED,
      },
    });
    bookingAId = bookingA.id;

    // Booking A2 (pending settlement)
    await prisma.booking.create({
      data: {
        code: testBookingCodes[1],
        originTenantId: tenantAId,
        servicingTenantId: tenantAId,
        serviceId: service.id,
        customerName: 'Khách Hàng Finance A2',
        customerPhone: '0911223355',
        addressText: '124 Test Street, Tenant A',
        scheduledAt: new Date(),
        totalAmount: 150000,
        baseUnitPrice: 150000,
        pricingType: ServicePricingType.HOURLY,
        status: BookingStatus.IN_PROGRESS,
      },
    });

    // Booking B for Tenant B
    const bookingB = await prisma.booking.create({
      data: {
        code: testBookingCodes[2],
        originTenantId: tenantBId,
        servicingTenantId: tenantBId,
        serviceId: service.id,
        assignedTaskerId: taskerBId,
        customerName: 'Khách Hàng Finance B',
        customerPhone: '0911223366',
        addressText: '456 Test Street, Tenant B',
        scheduledAt: new Date(),
        totalAmount: 400000,
        baseUnitPrice: 400000,
        pricingType: ServicePricingType.HOURLY,
        status: BookingStatus.COMPLETED,
      },
    });
    bookingBId = bookingB.id;

    // 8. Seed Transactions
    // TX 0: Tenant A Cash Collected
    await prisma.walletTransaction.create({
      data: {
        code: testTxCodes[0],
        tenantId: tenantAId,
        taskerId: taskerAId,
        bookingId: bookingAId,
        type: WalletTransactionType.CASH_COLLECTED,
        amount: 300000,
        direction: 'IN',
        balanceBefore: 500000,
        balanceAfter: 500000,
        paymentMethod: PaymentMethod.CASH,
        targetName: 'Nguyễn Văn Thợ Finance A',
        sourceName: 'Khách Hàng Finance A',
        notes: 'Thu tiền mặt đơn hàng Finance A',
        triggeredBy: 'SYSTEM_TEST',
      },
    });

    // TX 1: Tenant A Commission Fee
    await prisma.walletTransaction.create({
      data: {
        code: testTxCodes[1],
        tenantId: tenantAId,
        taskerId: taskerAId,
        bookingId: bookingAId,
        type: WalletTransactionType.COMMISSION_FEE,
        amount: 45000,
        direction: 'OUT',
        balanceBefore: 500000,
        balanceAfter: 455000,
        paymentMethod: PaymentMethod.WALLET,
        sourceName: 'Nguyễn Văn Thợ Finance A',
        targetName: 'Ánh Dương Service',
        notes: 'Hoa hồng sàn 15% cho đơn Finance A',
        triggeredBy: 'SYSTEM_TEST',
      },
    });

    // TX 2: Tenant A Top-up Deposit
    await prisma.walletTransaction.create({
      data: {
        code: testTxCodes[2],
        tenantId: tenantAId,
        taskerId: taskerAId,
        type: WalletTransactionType.TOP_UP_DEPOSIT,
        amount: 500000,
        direction: 'IN',
        balanceBefore: 0,
        balanceAfter: 500000,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        sourceName: 'Nguyễn Văn Thợ Finance A',
        targetName: 'Ví ký quỹ Thợ A',
        notes: 'Nạp tiền ký quỹ thợ Finance A',
        triggeredBy: 'SYSTEM_TEST',
      },
    });

    // TX 3: Tenant B Cash Collected
    await prisma.walletTransaction.create({
      data: {
        code: testTxCodes[3],
        tenantId: tenantBId,
        taskerId: taskerBId,
        bookingId: bookingBId,
        type: WalletTransactionType.CASH_COLLECTED,
        amount: 400000,
        direction: 'IN',
        balanceBefore: 600000,
        balanceAfter: 600000,
        paymentMethod: PaymentMethod.CASH,
        targetName: 'Trần Văn Thợ Finance B',
        sourceName: 'Khách Hàng Finance B',
        notes: 'Thu tiền mặt đơn hàng Finance B',
        triggeredBy: 'SYSTEM_TEST',
      },
    });

    // TX 4: Tenant B Commission Fee
    await prisma.walletTransaction.create({
      data: {
        code: testTxCodes[4],
        tenantId: tenantBId,
        taskerId: taskerBId,
        bookingId: bookingBId,
        type: WalletTransactionType.COMMISSION_FEE,
        amount: 60000,
        direction: 'OUT',
        balanceBefore: 600000,
        balanceAfter: 540000,
        paymentMethod: PaymentMethod.WALLET,
        sourceName: 'Trần Văn Thợ Finance B',
        targetName: 'Đối Tác Kế Toán B',
        notes: 'Hoa hồng sàn đơn Finance B',
        triggeredBy: 'SYSTEM_TEST',
      },
    });
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.walletTransaction.deleteMany({
      where: { code: { in: testTxCodes } },
    });
    await prisma.booking.deleteMany({
      where: { code: { in: testBookingCodes } },
    });
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
    await app.close();
  });

  describe('Test 1: Super Admin can query transactions across tenants', () => {
    it('Super Admin retrieves transactions from all tenants with pagination and summaries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/transactions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('transactions');
      expect(Array.isArray(res.body.transactions)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(5);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);

      // Sổ cái trả về chứa giao dịch của cả 2 Tenant
      const codes = res.body.transactions.map((t: { code: string }) => t.code);
      expect(codes).toContain(testTxCodes[0]); // Tenant A
      expect(codes).toContain(testTxCodes[3]); // Tenant B

      // Summary có chứa số liệu tổng hợp
      expect(res.body.summary).toBeDefined();
      expect(typeof res.body.summary.totalCashCollected).toBe('number');
      expect(typeof res.body.summary.totalCommissionFee).toBe('number');
      expect(typeof res.body.summary.totalDepositTopUp).toBe('number');
      expect(res.body.summary.totalCashCollected).toBeGreaterThanOrEqual(700000);
    });

    it('Super Admin can filter transactions specifically by tenantId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/finance/transactions?tenantId=${tenantAId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.transactions.length).toBeGreaterThanOrEqual(3);
      res.body.transactions.forEach((tx: { tenantId: string }) => {
        expect(tx.tenantId).toBe(tenantAId);
      });
    });
  });

  describe('Test 2: Tenant Admin queries transactions (restricted to their tenant)', () => {
    it('Tenant A Admin only sees transactions belonging to Tenant A', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/transactions')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('transactions');
      expect(res.body.transactions.length).toBeGreaterThanOrEqual(3);

      res.body.transactions.forEach((tx: { tenantId: string; code: string }) => {
        expect(tx.tenantId).toBe(tenantAId);
        expect(tx.code).not.toBe(testTxCodes[3]); // Không thấy của Tenant B
        expect(tx.code).not.toBe(testTxCodes[4]);
      });

      const codes = res.body.transactions.map((t: { code: string }) => t.code);
      expect(codes).toContain(testTxCodes[0]);
      expect(codes).toContain(testTxCodes[1]);
      expect(codes).toContain(testTxCodes[2]);

      // Summary của Tenant A
      expect(res.body.summary.totalCashCollected).toBeGreaterThanOrEqual(300000);
      expect(res.body.summary.totalCommissionFee).toBeGreaterThanOrEqual(45000);
      expect(res.body.summary.totalDepositTopUp).toBeGreaterThanOrEqual(500000);
    });
  });

  describe('Test 3: Search filter by transaction code, tasker name, or booking code', () => {
    it('searches accurately by transaction code', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/finance/transactions?search=${testTxCodes[0]}`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(res.body.transactions).toHaveLength(1);
      expect(res.body.transactions[0].code).toBe(testTxCodes[0]);
    });

    it('searches accurately by tasker name', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/transactions?search=Thợ Finance A')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(res.body.transactions.length).toBeGreaterThanOrEqual(3);
      const codes = res.body.transactions.map((t: { code: string }) => t.code);
      expect(codes).toContain(testTxCodes[0]);
      expect(codes).toContain(testTxCodes[1]);
      expect(codes).toContain(testTxCodes[2]);
    });

    it('searches accurately by booking code', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/finance/transactions?search=${testBookingCodes[0]}`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(res.body.transactions.length).toBeGreaterThanOrEqual(2);
      const codes = res.body.transactions.map((t: { code: string }) => t.code);
      expect(codes).toContain(testTxCodes[0]); // CASH_COLLECTED for booking A
      expect(codes).toContain(testTxCodes[1]); // COMMISSION_FEE for booking A
    });
  });

  describe('Test 4: Filter by paymentMethod and type (CASH_COLLECTED, COMMISSION_FEE)', () => {
    it('filters transactions by type CASH_COLLECTED', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/transactions?type=CASH_COLLECTED')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(res.body.transactions.length).toBeGreaterThanOrEqual(1);
      res.body.transactions.forEach((tx: { type: string }) => {
        expect(tx.type).toBe('CASH_COLLECTED');
      });
    });

    it('filters transactions by type COMMISSION_FEE', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/transactions?type=COMMISSION_FEE')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(res.body.transactions.length).toBeGreaterThanOrEqual(1);
      res.body.transactions.forEach((tx: { type: string }) => {
        expect(tx.type).toBe('COMMISSION_FEE');
      });
    });

    it('filters transactions by paymentMethod CASH', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/transactions?paymentMethod=CASH')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(res.body.transactions.length).toBeGreaterThanOrEqual(1);
      res.body.transactions.forEach((tx: { paymentMethod: string }) => {
        expect(tx.paymentMethod).toBe('CASH');
      });
    });

    it('filters transactions by both type and paymentMethod', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/transactions?type=COMMISSION_FEE&paymentMethod=WALLET')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(res.body.transactions.length).toBeGreaterThanOrEqual(1);
      res.body.transactions.forEach((tx: { type: string; paymentMethod: string }) => {
        expect(tx.type).toBe('COMMISSION_FEE');
        expect(tx.paymentMethod).toBe('WALLET');
      });
    });

    it('filters transactions by taskerId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/finance/transactions?taskerId=${taskerAId}`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(res.body.transactions.length).toBeGreaterThanOrEqual(3);
      res.body.transactions.forEach((tx: { taskerId: string }) => {
        expect(tx.taskerId).toBe(taskerAId);
      });
    });

    it('filters transactions by date range (startDate & endDate)', async () => {
      const startDate = new Date(Date.now() - 3600 * 1000).toISOString();
      const endDate = new Date(Date.now() + 3600 * 1000).toISOString();

      const res = await request(app.getHttpServer())
        .get(`/api/v1/finance/transactions?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(res.body.transactions.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Test 5: Summary endpoint returns valid numbers', () => {
    it('returns calculated financial summary for Tenant A', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/summary')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('grossServiceVolume');
      expect(res.body).toHaveProperty('platformCommissionEarned');
      expect(res.body).toHaveProperty('tenantNetRevenue');
      expect(res.body).toHaveProperty('totalDepositHeld');
      expect(res.body).toHaveProperty('pendingSettlementsCount');

      expect(res.body.grossServiceVolume).toBeGreaterThanOrEqual(300000);
      expect(res.body.platformCommissionEarned).toBeGreaterThanOrEqual(45000);
      expect(res.body.tenantNetRevenue).toBe(
        res.body.grossServiceVolume - res.body.platformCommissionEarned,
      );
      expect(res.body.totalDepositHeld).toBeGreaterThanOrEqual(500000);
      expect(res.body.pendingSettlementsCount).toBeGreaterThanOrEqual(1);
    });

    it('Super Admin can query financial summary cross-tenant or by specific tenant', async () => {
      const resCross = await request(app.getHttpServer())
        .get('/api/v1/finance/summary')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(resCross.body.grossServiceVolume).toBeGreaterThanOrEqual(700000);
      expect(resCross.body.platformCommissionEarned).toBeGreaterThanOrEqual(105000);

      const resTenantB = await request(app.getHttpServer())
        .get(`/api/v1/finance/summary?tenantId=${tenantBId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(resTenantB.body.grossServiceVolume).toBeGreaterThanOrEqual(400000);
      expect(resTenantB.body.platformCommissionEarned).toBeGreaterThanOrEqual(60000);
    });
  });

  describe('Test 6: Tenant isolation (Tenant B cannot read Tenant A transactions)', () => {
    it('Tenant B Admin cannot read Tenant A transactions even when passing tenantId in query', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/finance/transactions?tenantId=${tenantAId}`)
        .set('Authorization', `Bearer ${tenantBAdminToken}`)
        .expect(200);

      // Toàn bộ giao dịch trả về PHẢI là của Tenant B
      res.body.transactions.forEach((tx: { tenantId: string; code: string }) => {
        expect(tx.tenantId).toBe(tenantBId);
        expect(tx.code).not.toBe(testTxCodes[0]);
        expect(tx.code).not.toBe(testTxCodes[1]);
        expect(tx.code).not.toBe(testTxCodes[2]);
      });

      const codes = res.body.transactions.map((t: { code: string }) => t.code);
      expect(codes).toContain(testTxCodes[3]); // Có của Tenant B
    });

    it('Tenant B Admin summary cannot be manipulated by query tenantId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/finance/summary?tenantId=${tenantAId}`)
        .set('Authorization', `Bearer ${tenantBAdminToken}`)
        .expect(200);

      // Summary phải là của Tenant B, không phải của Tenant A
      expect(res.body.grossServiceVolume).toBeGreaterThanOrEqual(400000);
    });

    it('unauthenticated request is rejected with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/transactions')
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/finance/summary')
        .expect(401);
    });
  });
});
