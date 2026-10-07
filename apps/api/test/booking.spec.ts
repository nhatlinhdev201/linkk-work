import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';
import { BookingStatus, ServicePricingType, UserRole, PaymentMethod } from '@linkkwork/shared-types';
import { WalletTransaction, WalletTransactionType } from '@prisma/client';

describe('Booking Engine & Dispatch Module E2E / Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  let superAdminToken: string;
  let anhDuongAdminToken: string;
  let anhDuongTenantId: string;
  let otherTenantAdminToken: string;
  let otherTenantId: string;

  let hourlyServiceId: string;
  let testAddonId: string;
  let anhDuongTaskerId: string;
  let otherTaskerId: string;

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
    redis = moduleRef.get<RedisService>(RedisService);

    // 1. Login Super Admin
    const superAdminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@linkkwork.vn',
        password: 'Admin@123456',
      });
    superAdminToken = superAdminRes.body.accessToken;

    // 2. Login Partner Admin Ánh Dương
    const anhDuongRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@anhduong.vn',
        password: 'Partner@123456',
      });
    anhDuongAdminToken = anhDuongRes.body.accessToken;
    anhDuongTenantId = anhDuongRes.body.user.tenantId;

    // 3. Login or find another tenant
    const otherTenant = await prisma.tenant.findFirst({
      where: {
        id: { not: anhDuongTenantId },
        status: 'ACTIVE',
      },
    });

    if (otherTenant) {
      otherTenantId = otherTenant.id;
      // find a user for this tenant
      let otherUser = await prisma.user.findFirst({
        where: { tenantId: otherTenantId, role: UserRole.TENANT_ADMIN },
      });
      if (!otherUser) {
        otherUser = await prisma.user.create({
          data: {
            tenantId: otherTenantId,
            email: `admin_${Date.now()}@other.vn`,
            name: 'Other Tenant Admin',
            role: UserRole.TENANT_ADMIN,
            passwordHash: 'dummy',
            phone: '0988888888',
          },
        });
      }
    }

    // 4. Ensure hourly cleaning service exists with an addon
    let service = await prisma.service.findFirst({
      where: { pricingType: ServicePricingType.HOURLY, isActive: true },
      include: { addons: true },
    });

    if (!service) {
      const cat = await prisma.category.findFirst();
      service = await prisma.service.create({
        data: {
          name: 'Dọn dẹp kiểm thử Booking',
          slug: `don-dep-booking-test-${Date.now()}`,
          categoryId: cat!.id,
          pricingType: ServicePricingType.HOURLY,
          baseUnitPrice: 80000,
          isActive: true,
        },
        include: { addons: true },
      });
    }
    hourlyServiceId = service.id;

    let addon = service.addons[0];
    if (!addon) {
      addon = await prisma.addon.create({
        data: {
          serviceId: hourlyServiceId,
          name: 'Mang găng tay và khăn lau chuyên dụng',
          price: 30000,
          isActive: true,
        },
      });
    }
    testAddonId = addon.id;

    // 5. Create Tasker for Ánh Dương
    let anhDuongTasker = await prisma.user.findFirst({
      where: { tenantId: anhDuongTenantId, role: UserRole.TASKER },
    });
    if (!anhDuongTasker) {
      anhDuongTasker = await prisma.user.create({
        data: {
          tenantId: anhDuongTenantId,
          email: `tasker_ad_${Date.now()}@anhduong.vn`,
          name: 'Nguyễn Văn Thợ Ánh Dương',
          role: UserRole.TASKER,
          phone: '0912345678',
          passwordHash: 'dummy',
          taskerProfile: {
            create: {
              tenantId: anhDuongTenantId,
              rating: 4.9,
              completedJobsCount: 15,
              isOnline: true,
            },
          },
        },
      });
    }
    anhDuongTaskerId = anhDuongTasker.id;

    // 6. Create Tasker for other tenant
    let otherTasker = await prisma.user.findFirst({
      where: { tenantId: otherTenantId, role: UserRole.TASKER },
    });
    if (!otherTasker) {
      otherTasker = await prisma.user.create({
        data: {
          tenantId: otherTenantId,
          email: `tasker_other_${Date.now()}@other.vn`,
          name: 'Trần Văn Thợ Khác',
          role: UserRole.TASKER,
          phone: '0987654321',
          passwordHash: 'dummy',
          taskerProfile: {
            create: {
              tenantId: otherTenantId,
              rating: 4.8,
              completedJobsCount: 5,
              isOnline: true,
            },
          },
        },
      });
    }
    otherTaskerId = otherTasker.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Create Booking with Authoritative Pricing & Snapshot', () => {
    it('should create booking and calculate authoritative price correctly on server', async () => {
      // Input: 3 hours * 80,000 = 240,000
      // Addon: 30,000
      // Area surcharge: 20,000
      // Subtotal = 240,000 + 30,000 + 20,000 = 290,000
      // Surge: 1.2 -> surgeAmount = 290,000 * 0.2 = 58,000
      // preDiscountTotal = 348,000
      // Discount: 18,000
      // finalTotal = 330,000
      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({
          serviceId: hourlyServiceId,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          customerName: 'Khách Hàng VIP Test',
          customerPhone: '0909999888',
          addressText: '456 Hoàng Diệu, Quận 4, TP.HCM',
          durationHours: 3,
          addonIds: [testAddonId],
          areaSurcharge: 20000,
          surgeMultiplier: 1.2,
          voucherCode: 'TESTDISCOUNT18',
          discountAmount: 18000,
          note: 'Yêu cầu thợ tiêm đủ vaccine',
        })
        .expect(201);

      const booking = res.body;
      expect(booking).toBeDefined();
      expect(booking.id).toBeDefined();
      expect(booking.code).toMatch(/^BK-\d{4}-\d{6}$/);
      expect(booking.status).toBe(BookingStatus.PENDING_DISPATCH);
      expect(booking.originTenantId).toBe(anhDuongTenantId);
      expect(booking.servicingTenantId).toBe(anhDuongTenantId);

      // Verify financial snapshot
      expect(booking.baseUnitPrice).toBe(80000);
      expect(booking.durationHours).toBe(3);
      expect(booking.areaSurcharge).toBe(20000);
      expect(booking.addonsPrice).toBe(30000);
      expect(booking.surgeMultiplier).toBe(1.2);
      expect(booking.surgeAmount).toBe(58000);
      expect(booking.discountAmount).toBe(18000);
      expect(booking.totalAmount).toBe(330000);

      // Verify relations
      expect(booking.addons).toHaveLength(1);
      expect(booking.addons[0].addonId).toBe(testAddonId);
      expect(booking.events).toHaveLength(1);
      expect(booking.events[0].toStatus).toBe(BookingStatus.PENDING_DISPATCH);
    });

    it('should reject booking creation with invalid serviceId', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({
          serviceId: '00000000-0000-0000-0000-000000000000',
          scheduledAt: new Date().toISOString(),
          customerName: 'Test',
          customerPhone: '0901234567',
          addressText: 'Test address',
        })
        .expect(404);
    });

    it('should reject booking creation with invalid scheduledAt date', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({
          serviceId: hourlyServiceId,
          scheduledAt: 'invalid-date',
          customerName: 'Test',
          customerPhone: '0901234567',
          addressText: 'Test address',
        })
        .expect(400);
    });
  });

  describe('2. Query Bookings with Multi-Tenant Isolation & Pagination', () => {
    let createdBookingId: string;

    beforeAll(async () => {
      // Create a booking for Ánh Dương
      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({
          serviceId: hourlyServiceId,
          scheduledAt: new Date(Date.now() + 100000).toISOString(),
          customerName: 'Nguyễn Test Ánh Dương',
          customerPhone: '0901112233',
          addressText: '12 Nguyễn Trãi, Q1',
          durationHours: 2,
        });
      createdBookingId = res.body.id;
    });

    it('should list bookings with pagination format', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings?page=1&limit=5')
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .expect(200);

      expect(res.body.items).toBeDefined();
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(5);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should filter bookings by status', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/bookings?status=${BookingStatus.PENDING_DISPATCH}`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      res.body.items.forEach((item: any) => {
        expect(item.status).toBe(BookingStatus.PENDING_DISPATCH);
      });
    });

    it('should search bookings by customer name or phone', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings?search=Nguyễn Test Ánh Dương')
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items[0].customerName).toBe('Nguyễn Test Ánh Dương');
    });

    it('should allow Super Admin to view all bookings across tenants', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.items).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('should isolate bookings when Super Admin impersonates a tenant', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Impersonate-Tenant-Id', anhDuongTenantId)
        .expect(200);

      res.body.items.forEach((item: any) => {
        const belongs =
          item.servicingTenantId === anhDuongTenantId ||
          item.originTenantId === anhDuongTenantId;
        expect(belongs).toBe(true);
      });
    });
  });

  describe('3. Booking Details & Cross-Tenant Boundary Security', () => {
    let adBookingId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({
          serviceId: hourlyServiceId,
          scheduledAt: new Date(Date.now() + 200000).toISOString(),
          customerName: 'Khách Chi Tiết',
          customerPhone: '0903334444',
          addressText: '100 Lê Lợi, Q1',
          durationHours: 2,
        });
      adBookingId = res.body.id;
    });

    it('should return complete booking details with relations for authorized tenant', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/bookings/${adBookingId}`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .expect(200);

      expect(res.body.id).toBe(adBookingId);
      expect(res.body.service).toBeDefined();
      expect(res.body.events).toBeDefined();
      expect(res.body.originTenant).toBeDefined();
      expect(res.body.servicingTenant).toBeDefined();
    });

    it('should allow Super Admin to view any booking details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/bookings/${adBookingId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.id).toBe(adBookingId);
    });

    it('should reject Super Admin impersonating another tenant when accessing adBookingId', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/bookings/${adBookingId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Impersonate-Tenant-Id', otherTenantId)
        .expect(403);
    });
  });

  describe('4. Direct Tasker Assignment (Tenant Boundaries & State)', () => {
    let bookingToAssignId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({
          serviceId: hourlyServiceId,
          scheduledAt: new Date(Date.now() + 300000).toISOString(),
          customerName: 'Khách Gán Thợ',
          customerPhone: '0905556666',
          addressText: '200 Hai Bà Trưng, Q3',
          durationHours: 2,
        });
      bookingToAssignId = res.body.id;
    });

    it('should successfully assign tasker belonging to the servicing tenant', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingToAssignId}/assign`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({
          taskerId: anhDuongTaskerId,
          note: 'Chỉ định trực tiếp thợ cứng Ánh Dương',
        })
        .expect(201);

      expect(res.body.status).toBe(BookingStatus.ASSIGNED);
      expect(res.body.assignedTasker).toBeDefined();
      expect(res.body.assignedTasker.id).toBe(anhDuongTaskerId);

      // Verify Redis radar updated
      const redisStatus = await redis.get(`job:status:${bookingToAssignId}`);
      expect(redisStatus).toBe('ASSIGNED');

      // Verify event history recorded
      const events = res.body.events;
      const assignEvent = events.find((e: any) => e.toStatus === BookingStatus.ASSIGNED);
      expect(assignEvent).toBeDefined();
      expect(assignEvent.note).toContain('Chỉ định trực tiếp');
    });

    it('should forbid assigning tasker belonging to a DIFFERENT tenant', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingToAssignId}/assign`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({
          taskerId: otherTaskerId,
          note: 'Thử gán thợ của bên khác',
        })
        .expect(403);

      expect(res.body.message).toContain('không thuộc thẩm quyền của Tenant');
    });

    it('should allow Super Admin to direct assign tasker from another tenant and align servicingTenantId', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingToAssignId}/assign`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          taskerId: otherTaskerId,
          note: 'Super Admin phân công thợ toàn sàn',
        })
        .expect(201);

      expect(res.body.status).toBe(BookingStatus.ASSIGNED);
      expect(res.body.assignedTasker).toBeDefined();
      expect(res.body.assignedTasker.id).toBe(otherTaskerId);
      expect(res.body.servicingTenantId).toBe(otherTenantId);

      const redisStatus = await redis.get(`job:status:${bookingToAssignId}`);
      expect(redisStatus).toBe('ASSIGNED');
    });

    it('should reject assignment when booking is already in non-dispatchable state', async () => {
      // First assign
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingToAssignId}/assign`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ taskerId: anhDuongTaskerId });

      // Transition to IN_PROGRESS
      await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingToAssignId}/status`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ status: BookingStatus.ARRIVING });

      await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingToAssignId}/status`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ status: BookingStatus.IN_PROGRESS });

      // Now attempt to direct assign should fail (status is IN_PROGRESS)
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingToAssignId}/assign`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ taskerId: anhDuongTaskerId })
        .expect(400);
    });
  });

  describe('5. Booking State Machine Lifecycle & Transitions', () => {
    let lifecycleBookingId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({
          serviceId: hourlyServiceId,
          scheduledAt: new Date(Date.now() + 400000).toISOString(),
          customerName: 'Khách Lifecycle',
          customerPhone: '0907778888',
          addressText: '300 Nam Kỳ Khởi Nghĩa, Q3',
          durationHours: 2,
        });
      lifecycleBookingId = res.body.id;
    });

    it('should complete full lifecycle from PENDING_DISPATCH to COMPLETED', async () => {
      // 1. PENDING_DISPATCH -> ASSIGNED
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${lifecycleBookingId}/assign`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ taskerId: anhDuongTaskerId })
        .expect(201);

      // 2. ASSIGNED -> ARRIVING
      let res = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${lifecycleBookingId}/status`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ status: BookingStatus.ARRIVING, note: 'Thợ đang trên đường tới' })
        .expect(200);
      expect(res.body.status).toBe(BookingStatus.ARRIVING);

      // 3. ARRIVING -> IN_PROGRESS
      res = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${lifecycleBookingId}/status`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ status: BookingStatus.IN_PROGRESS, note: 'Bắt đầu làm việc' })
        .expect(200);
      expect(res.body.status).toBe(BookingStatus.IN_PROGRESS);

      // 4. IN_PROGRESS -> PENDING_ACCEPTANCE
      res = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${lifecycleBookingId}/status`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ status: BookingStatus.PENDING_ACCEPTANCE, note: 'Hoàn tất nghiệm thu' })
        .expect(200);
      expect(res.body.status).toBe(BookingStatus.PENDING_ACCEPTANCE);

      // 5. PENDING_ACCEPTANCE -> COMPLETED
      res = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${lifecycleBookingId}/status`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ status: BookingStatus.COMPLETED, note: 'Khách xác nhận hài lòng' })
        .expect(200);
      expect(res.body.status).toBe(BookingStatus.COMPLETED);

      // 6. COMPLETED -> REVIEWED
      res = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${lifecycleBookingId}/status`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ status: BookingStatus.REVIEWED, note: 'Đánh giá 5 sao' })
        .expect(200);
      expect(res.body.status).toBe(BookingStatus.REVIEWED);
    });

    it('should reject invalid transition skipping steps (e.g. PENDING_DISPATCH to COMPLETED)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${lifecycleBookingId}/status`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ status: BookingStatus.COMPLETED })
        .expect(400);

      expect(res.body.message).toContain('Chuyển đổi trạng thái không hợp lệ');
    });

    it('should allow cancellation from PENDING_DISPATCH', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${lifecycleBookingId}/status`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ status: BookingStatus.CANCELLED, note: 'Khách đổi kế hoạch đi công tác' })
        .expect(200);

      expect(res.body.status).toBe(BookingStatus.CANCELLED);
    });

    it('should allow admin to reject acceptance and return PENDING_ACCEPTANCE to IN_PROGRESS (rework flow)', async () => {
      // Step to PENDING_ACCEPTANCE
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${lifecycleBookingId}/assign`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ taskerId: anhDuongTaskerId });

      await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${lifecycleBookingId}/status`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ status: BookingStatus.ARRIVING });

      await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${lifecycleBookingId}/status`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ status: BookingStatus.IN_PROGRESS });

      await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${lifecycleBookingId}/status`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ status: BookingStatus.PENDING_ACCEPTANCE });

      // Admin rejects acceptance report -> returns to IN_PROGRESS
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${lifecycleBookingId}/status`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({
          status: BookingStatus.IN_PROGRESS,
          note: 'Chưa lau dọn khu vực ban công, yêu cầu hoàn tất lại',
        })
        .expect(200);

      expect(res.body.status).toBe(BookingStatus.IN_PROGRESS);
    });

    it('should allow direct completion from IN_PROGRESS and release escrow payment to tasker', async () => {
      // Step to IN_PROGRESS
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${lifecycleBookingId}/assign`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ taskerId: anhDuongTaskerId });

      await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${lifecycleBookingId}/status`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ status: BookingStatus.ARRIVING });

      await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${lifecycleBookingId}/status`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ status: BookingStatus.IN_PROGRESS });

      // Direct completion from IN_PROGRESS
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${lifecycleBookingId}/status`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({
          status: BookingStatus.COMPLETED,
          note: 'Khách hàng thanh toán và nghiệm thu trực tiếp tại chỗ',
        })
        .expect(200);

      expect(res.body.status).toBe(BookingStatus.COMPLETED);
      expect(res.body.paymentStatus).toBe('RELEASED_TO_TASKER');

      // Verify dual-entry transactions were created upon completion
      const completionTransactions = await prisma.walletTransaction.findMany({
        where: { bookingId: lifecycleBookingId },
      });
      expect(completionTransactions).toHaveLength(2);

      const cashTx = completionTransactions.find(
        (t: WalletTransaction) => t.type === WalletTransactionType.CASH_COLLECTED,
      );
      expect(cashTx).toBeDefined();
      expect(cashTx?.sourceType).toBe('CUSTOMER');
      expect(cashTx?.targetType).toBe('TASKER');
      expect(cashTx?.paymentMethod).toBe(PaymentMethod.CASH);
      expect(cashTx?.direction).toBe('IN');

      const commissionTx = completionTransactions.find(
        (t: WalletTransaction) => t.type === WalletTransactionType.COMMISSION_FEE,
      );
      expect(commissionTx).toBeDefined();
      expect(commissionTx?.sourceType).toBe('TASKER');
      expect(commissionTx?.targetType).toBe('TENANT');
      expect(commissionTx?.paymentMethod).toBe(PaymentMethod.WALLET);
      expect(commissionTx?.direction).toBe('OUT');
    });
  });

  describe('6. Radar Broadcasting', () => {
    it('should broadcast booking and open job status on Redis', async () => {
      const resCreate = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({
          serviceId: hourlyServiceId,
          scheduledAt: new Date(Date.now() + 500000).toISOString(),
          customerName: 'Khách Radar Test',
          customerPhone: '0901239999',
          addressText: '400 Điện Biên Phủ, Bình Thạnh',
          durationHours: 2,
        });

      const bookingId = resCreate.body.id;

      const resBroadcast = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingId}/broadcast`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .expect(201);

      expect(resBroadcast.body.status).toBe(BookingStatus.BROADCASTING);

      // Check Redis radar status
      const redisStatus = await redis.get(`job:status:${bookingId}`);
      expect(redisStatus).toBe('OPEN');
    });
  });

  describe('7. Cash Payment & Commission Ledger', () => {
    let cashBookingId: string;
    let initialDeposit: number;

    it('should create booking with CASH paymentMethod and assign tasker', async () => {
      // Check tasker initial deposit balance
      const profile = await prisma.taskerProfile.findUnique({
        where: { userId: anhDuongTaskerId },
      });
      initialDeposit = profile?.depositBalance ?? 500000;

      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({
          serviceId: hourlyServiceId,
          scheduledAt: new Date(Date.now() + 600000).toISOString(),
          customerName: 'Khách Tiền Mặt Test',
          customerPhone: '0901237777',
          addressText: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
          durationHours: 3,
          paymentMethod: PaymentMethod.CASH,
        })
        .expect(201);

      cashBookingId = res.body.id;
      expect(res.body.paymentMethod).toBe(PaymentMethod.CASH);
      expect(res.body.paymentStatus).toBe('PENDING');

      // Assign tasker
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${cashBookingId}/assign`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({ taskerId: anhDuongTaskerId })
        .expect(201);
    });

    it('should record cash payment and automatically deduct commission from tasker deposit balance', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${cashBookingId}/record-cash-payment`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({
          note: 'Khách hàng thanh toán đủ 240.000đ tiền mặt cho thợ tại nhà',
        })
        .expect(201);

      expect(res.body.paymentStatus).toBe('RELEASED_TO_TASKER');
      expect(res.body.paymentMethod).toBe(PaymentMethod.CASH);
      expect(res.body.paidAt).toBeDefined();

      // Verify commission deduction in tasker profile
      const updatedProfile = await prisma.taskerProfile.findUnique({
        where: { userId: anhDuongTaskerId },
      });
      // 15% commission of 240,000đ = 36,000đ
      const expectedCommission = Math.round(res.body.totalAmount * 0.15);
      expect(updatedProfile?.depositBalance).toBe(initialDeposit - expectedCommission);

      // Verify dual-entry wallet transactions
      const transactions = await prisma.walletTransaction.findMany({
        where: { bookingId: cashBookingId },
        orderBy: { createdAt: 'asc' },
      });
      expect(transactions).toHaveLength(2);

      const cashTx = transactions.find((t: WalletTransaction) => t.type === WalletTransactionType.CASH_COLLECTED);
      expect(cashTx).toBeDefined();
      expect(cashTx?.amount).toBe(res.body.totalAmount);
      expect(cashTx?.direction).toBe('IN');
      expect(cashTx?.balanceBefore).toBe(initialDeposit);
      expect(cashTx?.balanceAfter).toBe(initialDeposit);
      expect(cashTx?.sourceType).toBe('CUSTOMER');
      expect(cashTx?.sourceName).toBe('Khách Tiền Mặt Test');
      expect(cashTx?.targetType).toBe('TASKER');
      expect(cashTx?.targetId).toBe(anhDuongTaskerId);
      expect(cashTx?.targetName).toBe('Nguyễn Văn Thợ Ánh Dương');
      expect(cashTx?.paymentMethod).toBe(PaymentMethod.CASH);

      const commissionTx = transactions.find((t: WalletTransaction) => t.type === WalletTransactionType.COMMISSION_FEE);
      expect(commissionTx).toBeDefined();
      expect(commissionTx?.amount).toBe(expectedCommission);
      expect(commissionTx?.direction).toBe('OUT');
      expect(commissionTx?.balanceBefore).toBe(initialDeposit);
      expect(commissionTx?.balanceAfter).toBe(initialDeposit - expectedCommission);
      expect(commissionTx?.sourceType).toBe('TASKER');
      expect(commissionTx?.sourceId).toBe(anhDuongTaskerId);
      expect(commissionTx?.sourceName).toBe('Nguyễn Văn Thợ Ánh Dương');
      expect(commissionTx?.targetType).toBe('TENANT');
      expect(commissionTx?.targetId).toBe(anhDuongTenantId);
      expect(commissionTx?.paymentMethod).toBe(PaymentMethod.WALLET);
    });

    it('should reject recording cash payment a second time (idempotency/duplicate check)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${cashBookingId}/record-cash-payment`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .send({
          note: 'Cố tình ghi nhận lần 2',
        })
        .expect(400);
    });

    it('should include walletTransactions and payment fields in booking detail query', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/bookings/${cashBookingId}`)
        .set('Authorization', `Bearer ${anhDuongAdminToken}`)
        .expect(200);

      expect(res.body.paymentStatus).toBe('RELEASED_TO_TASKER');
      expect(res.body.paymentMethod).toBe(PaymentMethod.CASH);
      expect(res.body.paidAt).toBeDefined();
      expect(res.body.walletTransactions).toBeDefined();
      expect(res.body.walletTransactions).toHaveLength(2);

      const cashTx = res.body.walletTransactions.find(
        (t: WalletTransaction) => t.type === WalletTransactionType.CASH_COLLECTED,
      );
      expect(cashTx).toBeDefined();
      expect(cashTx.sourceType).toBe('CUSTOMER');
      expect(cashTx.targetType).toBe('TASKER');
      expect(cashTx.targetName).toBe('Nguyễn Văn Thợ Ánh Dương');
      expect(cashTx.paymentMethod).toBe(PaymentMethod.CASH);

      const commissionTx = res.body.walletTransactions.find(
        (t: WalletTransaction) => t.type === WalletTransactionType.COMMISSION_FEE,
      );
      expect(commissionTx).toBeDefined();
      expect(commissionTx.sourceType).toBe('TASKER');
      expect(commissionTx.targetType).toBe('TENANT');
      expect(commissionTx.paymentMethod).toBe(PaymentMethod.WALLET);
    });
  });
});
