import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting LinkkWork database seed...');

  // 1. Default Platform Tenant
  const platformTenant = await prisma.tenant.upsert({
    where: { code: 'TENANT_LINKKWORK' },
    update: {},
    create: {
      code: 'TENANT_LINKKWORK',
      name: 'LinkkWork Platform',
      phone: '19006868',
      email: 'contact@linkkwork.vn',
      city: 'Hồ Chí Minh',
      status: 'ACTIVE',
      plan: 'ENTERPRISE',
      commissionRate: 15.0,
      isDefault: true,
    },
  });
  console.log(`✅ Default platform tenant seeded: ${platformTenant.name} (${platformTenant.id})`);

  // 2. Super Admin User
  const superAdminPasswordHash = await bcrypt.hash('Admin@123456', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@linkkwork.vn' },
    update: {
      passwordHash: superAdminPasswordHash,
      role: 'SUPER_ADMIN',
      isSuperAdmin: true,
      tenantId: platformTenant.id,
    },
    create: {
      email: 'admin@linkkwork.vn',
      name: 'Super Admin',
      phone: '0900000001',
      passwordHash: superAdminPasswordHash,
      role: 'SUPER_ADMIN',
      isSuperAdmin: true,
      tenantId: platformTenant.id,
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Super Admin seeded: ${superAdmin.email}`);

  // 3. Partner Tenant & Admin
  const partnerTenant = await prisma.tenant.upsert({
    where: { code: 'TENANT_ANH_DUONG' },
    update: {},
    create: {
      code: 'TENANT_ANH_DUONG',
      name: 'Công ty Vệ Sinh Ánh Dương',
      phone: '0901234567',
      email: 'contact@anhduong.vn',
      city: 'Hồ Chí Minh',
      status: 'ACTIVE',
      plan: 'BASIC',
      commissionRate: 15.0,
      isDefault: false,
    },
  });
  console.log(`✅ Partner tenant seeded: ${partnerTenant.name} (${partnerTenant.id})`);

  const partnerAdminPasswordHash = await bcrypt.hash('Partner@123456', 10);
  const partnerAdmin = await prisma.user.upsert({
    where: { email: 'admin@anhduong.vn' },
    update: {
      passwordHash: partnerAdminPasswordHash,
      role: 'TENANT_ADMIN',
      tenantId: partnerTenant.id,
    },
    create: {
      email: 'admin@anhduong.vn',
      name: 'Ánh Dương Admin',
      phone: '0901234568',
      passwordHash: partnerAdminPasswordHash,
      role: 'TENANT_ADMIN',
      isSuperAdmin: false,
      tenantId: partnerTenant.id,
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Partner Admin seeded: ${partnerAdmin.email}`);

  // 4. Sample Categories
  const catCleaning = await prisma.category.upsert({
    where: { slug: 'don-dep-ve-sinh' },
    update: {},
    create: {
      name: 'Dọn dẹp vệ sinh',
      slug: 'don-dep-ve-sinh',
      icon: 'sparkles',
      displayOrder: 1,
      isActive: true,
    },
  });

  const catHVAC = await prisma.category.upsert({
    where: { slug: 'dien-lanh-thiet-bi' },
    update: {},
    create: {
      name: 'Điện lạnh & Thiết bị',
      slug: 'dien-lanh-thiet-bi',
      icon: 'air-conditioner',
      displayOrder: 2,
      isActive: true,
    },
  });

  const catRepair = await prisma.category.upsert({
    where: { slug: 'sua-chua-gia-dung' },
    update: {},
    create: {
      name: 'Sửa chữa gia dụng',
      slug: 'sua-chua-gia-dung',
      icon: 'wrench',
      displayOrder: 3,
      isActive: true,
    },
  });
  console.log(`✅ Categories seeded: ${catCleaning.name}, ${catHVAC.name}, ${catRepair.name}`);

  // 5. Sample Services
  const cleaningService = await prisma.service.upsert({
    where: { slug: 'don-dep-nha-theo-gio' },
    update: {},
    create: {
      name: 'Dọn dẹp nhà theo giờ',
      slug: 'don-dep-nha-theo-gio',
      categoryId: catCleaning.id,
      tenantId: platformTenant.id,
      pricingType: 'HOURLY',
      baseUnitPrice: 80000,
      durationHours: 2,
      description: 'Dịch vụ dọn dẹp vệ sinh nhà ở chuyên nghiệp theo giờ',
      isActive: true,
    },
  });

  const hvacService = await prisma.service.upsert({
    where: { slug: 've-sinh-may-lanh' },
    update: {},
    create: {
      name: 'Vệ sinh máy lạnh',
      slug: 've-sinh-may-lanh',
      categoryId: catHVAC.id,
      tenantId: platformTenant.id,
      pricingType: 'PER_UNIT',
      baseUnitPrice: 150000,
      durationHours: 1,
      description: 'Bảo dưỡng và vệ sinh máy lạnh các loại định kỳ',
      isActive: true,
    },
  });
  console.log(`✅ Services seeded: ${cleaningService.name}, ${hvacService.name}`);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
