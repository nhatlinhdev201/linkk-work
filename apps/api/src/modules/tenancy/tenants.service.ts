import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterPartnerDto } from './dto/register-partner.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenants() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            taskerProfiles: true,
            originBookings: true,
            servicingBookings: true,
            users: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map((tenant) => ({
      ...tenant,
      taskerCount: tenant._count?.taskerProfiles ?? 0,
      bookingCount:
        (tenant._count?.originBookings ?? 0) + (tenant._count?.servicingBookings ?? 0),
      userCount: tenant._count?.users ?? 0,
    }));
  }

  async getTenantById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            taskerProfiles: true,
            originBookings: true,
            servicingBookings: true,
            users: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return {
      ...tenant,
      taskerCount: tenant._count?.taskerProfiles ?? 0,
      bookingCount:
        (tenant._count?.originBookings ?? 0) + (tenant._count?.servicingBookings ?? 0),
      userCount: tenant._count?.users ?? 0,
    };
  }

  async registerPartner(dto: RegisterPartnerDto) {
    const email = dto.contactEmail.toLowerCase();

    // Check if user with contact email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(`User with email "${email}" already exists`);
    }

    // Check if tenant with taxId already exists
    const existingTenant = await this.prisma.tenant.findFirst({
      where: { taxId: dto.taxId },
    });
    if (existingTenant) {
      throw new ConflictException(`Tenant with tax ID "${dto.taxId}" already exists`);
    }

    // Generate unique tenant code
    let code = `TENANT_${dto.taxId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;
    const codeExists = await this.prisma.tenant.findUnique({
      where: { code },
    });
    if (codeExists) {
      code = `${code}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    }

    const passwordHash = await bcrypt.hash(dto.password || 'Partner@123456', 10);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Tenant with RESTRICTED status
      const tenant = await tx.tenant.create({
        data: {
          code,
          name: dto.businessName,
          taxId: dto.taxId,
          phone: dto.contactPhone,
          email,
          city: dto.city,
          status: 'RESTRICTED',
          plan: 'BASIC',
          commissionRate: 15.0,
          isDefault: false,
        },
      });

      // 2. Create Initial Tenant Admin User
      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          name: dto.contactName,
          phone: dto.contactPhone,
          passwordHash,
          role: 'TENANT_ADMIN',
          status: 'ACTIVE',
          isSuperAdmin: false,
        },
      });

      // 3. Record Audit Log for partner onboarding
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: adminUser.id,
          action: 'PARTNER_REGISTERED',
          resource: 'Tenant',
          resourceId: tenant.id,
          payload: {
            businessName: dto.businessName,
            taxId: dto.taxId,
            contactName: dto.contactName,
            contactEmail: email,
            services: dto.services,
            city: dto.city,
            address: dto.address,
          },
        },
      });

      const { passwordHash: _, ...sanitizedAdmin } = adminUser;

      return {
        tenant,
        adminUser: sanitizedAdmin,
        message: 'Partner tenant registered successfully and pending approval',
      };
    });
  }

  async approveTenant(tenantId: string, reviewerId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'ACTIVE' },
    });

    // Log approval to AuditLog
    await this.prisma.auditLog.create({
      data: {
        tenantId: updatedTenant.id,
        userId: reviewerId,
        action: 'TENANT_APPROVED',
        resource: 'Tenant',
        resourceId: updatedTenant.id,
        payload: {
          reviewerId,
          previousStatus: tenant.status,
          newStatus: 'ACTIVE',
          approvedAt: new Date().toISOString(),
        },
      },
    });

    return updatedTenant;
  }
}
