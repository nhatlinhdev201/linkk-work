import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';
import { UserRole } from '@linkkwork/shared-types';

describe('Auth and Tenancy Module Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  let superAdminToken: string;
  let partnerAdminToken: string;
  let partnerTenantId: string;
  let platformTenantId: string;
  let suspendedTenantId: string;

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

    // Retrieve seeded tenants for testing
    const platformTenant = await prisma.tenant.findUnique({
      where: { code: 'TENANT_LINKKWORK' },
    });
    const partnerTenant = await prisma.tenant.findUnique({
      where: { code: 'TENANT_ANH_DUONG' },
    });

    platformTenantId = platformTenant!.id;
    partnerTenantId = partnerTenant!.id;

    // Seed a suspended tenant and user for testing subscription suspension checks
    const existingSuspendedTenant = await prisma.tenant.findUnique({
      where: { code: 'TENANT_SUSPENDED_TEST' },
    });
    if (existingSuspendedTenant) {
      await prisma.user.deleteMany({ where: { tenantId: existingSuspendedTenant.id } });
      await prisma.tenant.delete({ where: { id: existingSuspendedTenant.id } });
    }

    const suspendedTenant = await prisma.tenant.create({
      data: {
        code: 'TENANT_SUSPENDED_TEST',
        name: 'Suspended Test Partner',
        phone: '0909999888',
        email: 'suspended@tenant.vn',
        city: 'Hà Nội',
        status: 'SUSPENDED',
      },
    });
    suspendedTenantId = suspendedTenant.id;

    const testPasswordHash = await bcrypt.hash('Suspended@123', 10);
    await prisma.user.create({
      data: {
        tenantId: suspendedTenant.id,
        email: 'user@suspended-tenant.vn',
        name: 'Suspended User',
        passwordHash: testPasswordHash,
        role: UserRole.TENANT_ADMIN,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    if (prisma && suspendedTenantId) {
      await prisma.user.deleteMany({ where: { tenantId: suspendedTenantId } });
      await prisma.tenant.deleteMany({ where: { id: suspendedTenantId } });
    }
    if (app) {
      await app.close();
    }
  });

  describe('Authentication Module (/api/v1/auth)', () => {
    it('should login with Super Admin credentials and return tokens and user object', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@linkkwork.vn',
          password: 'Admin@123456',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');

      const user = response.body.user;
      expect(user.email).toBe('admin@linkkwork.vn');
      expect(user.role).toBe(UserRole.SUPER_ADMIN);
      expect(user.isSuperAdmin).toBe(true);
      expect(user.passwordHash).toBeUndefined();

      superAdminToken = response.body.accessToken;
    });

    it('should login with Partner Admin credentials and return tokens with tenantId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@anhduong.vn',
          password: 'Partner@123456',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');

      const user = response.body.user;
      expect(user.email).toBe('admin@anhduong.vn');
      expect(user.role).toBe(UserRole.TENANT_ADMIN);
      expect(user.tenantId).toBe(partnerTenantId);
      expect(user.isSuperAdmin).toBe(false);

      partnerAdminToken = response.body.accessToken;
    });

    it('should return 401 Unauthorized for wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@linkkwork.vn',
          password: 'WrongPassword@999',
        })
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    it('should reject login for users belonging to a SUSPENDED tenant with 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'user@suspended-tenant.vn',
          password: 'Suspended@123',
        })
        .expect(401);

      expect(response.body.message).toContain('Tenant account is suspended');
    });

    it('should return user profile on /api/v1/auth/me with Bearer token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .expect(200);

      expect(response.body.email).toBe('admin@anhduong.vn');
      expect(response.body.role).toBe(UserRole.TENANT_ADMIN);
      expect(response.body.tenant).toBeDefined();
      expect(response.body.tenant.id).toBe(partnerTenantId);
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('should rotate tokens and invalidate token family upon replay attack detection', async () => {
      // 1. Login to get fresh tokens
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@anhduong.vn',
          password: 'Partner@123456',
        })
        .expect(200);

      const tokenA = loginRes.body.refreshToken;

      // 2. Refresh token A -> yields token B
      const refreshRes1 = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokenA })
        .expect(200);

      const tokenB = refreshRes1.body.refreshToken;
      expect(tokenB).not.toBe(tokenA);

      // 3. Refresh token B -> yields token C
      const refreshRes2 = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokenB })
        .expect(200);

      const tokenC = refreshRes2.body.refreshToken;
      expect(tokenC).not.toBe(tokenB);

      // 4. Suspected Replay Attack: Replaying already-revoked token A
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokenA })
        .expect(401);

      // 5. Family Revocation: Replay attack triggered revocation of all active tokens for this user
      // Token C should now also be rejected with 401
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokenC })
        .expect(401);
    });

    it('should revoke token and clear Redis on logout', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@anhduong.vn',
          password: 'Partner@123456',
        })
        .expect(200);

      const { accessToken, refreshToken } = loginRes.body;

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // Refresh token should now be revoked
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('Tenant Context & Impersonation Guard', () => {
    it('should resolve tenant context correctly when Super Admin sends X-Impersonate-Tenant-Id header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-impersonate-tenant-id', partnerTenantId)
        .expect(200);

      expect(response.body.resolvedTenantId).toBe(partnerTenantId);
      expect(response.body.isImpersonating).toBe(true);
    });

    it('should reject non-superadmin sending X-Impersonate-Tenant-Id with 403 Forbidden', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .set('x-impersonate-tenant-id', platformTenantId)
        .expect(403);

      expect(response.body.message).toContain('impersonate');
    });

    it('should enforce cross-tenant boundary isolation during Super Admin impersonation', async () => {
      // 1. When impersonating partnerTenantId, Super Admin can access partnerTenantId details
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${partnerTenantId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-impersonate-tenant-id', partnerTenantId)
        .expect(200);

      expect(response.body.id).toBe(partnerTenantId);

      // 2. When impersonating partnerTenantId, Super Admin is BLOCKED from accessing other tenants
      await request(app.getHttpServer())
        .get(`/api/v1/tenants/${platformTenantId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-impersonate-tenant-id', partnerTenantId)
        .expect(403);
    });
  });

  describe('Tenancy Module (/api/v1/tenants)', () => {
    const testPartnerTaxId = '0399887711';
    let createdTenantId: string;

    it('should allow Super Admin to list tenants with tasker and booking counts', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      const first = response.body[0];
      expect(first).toHaveProperty('taskerCount');
      expect(first).toHaveProperty('bookingCount');
    });

    it('should forbid non-superadmin from listing all tenants', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .expect(403);
    });

    it('should reject partner registration if password is missing or shorter than 8 characters', async () => {
      // Missing password
      await request(app.getHttpServer())
        .post('/api/v1/tenants/register')
        .send({
          businessName: 'Công ty Dịch Vụ Hoàng Kim',
          taxId: '0399887799',
          contactName: 'Hoàng Kim Admin',
          contactPhone: '0912345699',
          contactEmail: 'admin@hoangkim-invalid.vn',
          city: 'Hồ Chí Minh',
          services: ['don-dep-nha-theo-gio'],
        })
        .expect(400);

      // Password < 8 characters
      await request(app.getHttpServer())
        .post('/api/v1/tenants/register')
        .send({
          businessName: 'Công ty Dịch Vụ Hoàng Kim',
          taxId: '0399887799',
          contactName: 'Hoàng Kim Admin',
          contactPhone: '0912345699',
          contactEmail: 'admin@hoangkim-invalid.vn',
          city: 'Hồ Chí Minh',
          services: ['don-dep-nha-theo-gio'],
          password: 'short',
        })
        .expect(400);
    });

    it('should register a new partner with required password (>=8 chars) and status RESTRICTED', async () => {
      // Clean up previous test run if exists
      await prisma.auditLog.deleteMany({
        where: { user: { email: 'admin@hoangkim.vn' } },
      });
      await prisma.user.deleteMany({
        where: { email: 'admin@hoangkim.vn' },
      });
      await prisma.tenant.deleteMany({
        where: { taxId: testPartnerTaxId },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/tenants/register')
        .send({
          businessName: 'Công ty Dịch Vụ Hoàng Kim',
          taxId: testPartnerTaxId,
          contactName: 'Hoàng Kim Admin',
          contactPhone: '0912345699',
          contactEmail: 'admin@hoangkim.vn',
          city: 'Hồ Chí Minh',
          services: ['don-dep-nha-theo-gio'],
          address: '456 Lê Lợi, Quận 1',
          password: 'SecurePassword@123',
        })
        .expect(201);

      expect(response.body.tenant).toBeDefined();
      expect(response.body.tenant.status).toBe('RESTRICTED');
      expect(response.body.tenant.name).toBe('Công ty Dịch Vụ Hoàng Kim');
      expect(response.body.adminUser).toBeDefined();
      expect(response.body.adminUser.email).toBe('admin@hoangkim.vn');

      createdTenantId = response.body.tenant.id;

      // Verify Audit Log creation
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          tenantId: createdTenantId,
          action: 'PARTNER_REGISTERED',
        },
      });
      expect(auditLog).toBeDefined();
    });

    it('should allow Super Admin to approve partner tenant and set status to ACTIVE', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${createdTenantId}/approve`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');

      // Verify Audit Log was recorded
      const approvalAuditLog = await prisma.auditLog.findFirst({
        where: {
          tenantId: createdTenantId,
          action: 'TENANT_APPROVED',
        },
      });
      expect(approvalAuditLog).toBeDefined();
      expect(approvalAuditLog?.userId).toBeDefined();
    });

    it('should forbid non-superadmin from approving partner tenant', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${createdTenantId}/approve`)
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .expect(403);
    });

    it('should allow tenant admin to get their own tenant details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${partnerTenantId}`)
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .expect(200);

      expect(response.body.id).toBe(partnerTenantId);
      expect(response.body.name).toBe('Công ty Vệ Sinh Ánh Dương');
    });

    it('should forbid tenant admin from accessing another tenant details', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tenants/${platformTenantId}`)
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .expect(403);
    });
  });
});
