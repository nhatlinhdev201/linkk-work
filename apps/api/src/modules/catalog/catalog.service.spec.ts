import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { PricingEngine } from './pricing.engine';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ServicePricingType } from '@linkkwork/shared-types';

describe('CatalogService', () => {
  let service: CatalogService;
  let prisma: {
    category: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    service: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    tenant: {
      findUnique: jest.Mock;
    };
  };
  let pricingEngine: {
    calculate: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      service: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
    };

    pricingEngine = {
      calculate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: prisma },
        { provide: PricingEngine, useValue: pricingEngine },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  describe('getCategories', () => {
    it('should return all active categories sorted by displayOrder', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Cleaning', isActive: true, displayOrder: 1 },
      ];
      prisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategories();
      expect(result).toEqual(mockCategories);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      });
    });
  });

  describe('createCategory', () => {
    it('should create category with generated slug if not provided', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockImplementation(({ data }) => Promise.resolve({ id: 'cat-1', ...data }));

      const result = await service.createCategory({
        name: 'Vệ sinh máy lạnh',
      });

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          name: 'Vệ sinh máy lạnh',
          slug: 've-sinh-may-lanh',
          icon: null,
          displayOrder: 0,
        },
      });
      expect(result.slug).toBe('ve-sinh-may-lanh');
    });

    it('should generate unique slug if slug collision occurs', async () => {
      // First slug collision, second check free
      prisma.category.findUnique
        .mockResolvedValueOnce({ id: 'existing-cat', slug: 'cleaning' })
        .mockResolvedValueOnce(null);

      prisma.category.create.mockImplementation(({ data }) => Promise.resolve({ id: 'cat-2', ...data }));

      const result = await service.createCategory({
        name: 'Cleaning',
        slug: 'cleaning',
      });

      expect(result.slug).toBe('cleaning-1');
    });
  });

  describe('getServices', () => {
    it('should query services where tenantId is null or matches currentTenantId', async () => {
      const mockServices = [
        { id: 'srv-1', name: 'Platform Service', tenantId: null, category: {}, addons: [] },
      ];
      prisma.service.findMany.mockResolvedValue(mockServices);

      const result = await service.getServices('tenant-123');

      expect(result).toEqual(mockServices);
      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { tenantId: null },
            { tenantId: 'tenant-123' },
            { tenant: { isDefault: true } },
          ],
        },
        include: {
          category: true,
          addons: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should query platform services when currentTenantId is null', async () => {
      prisma.service.findMany.mockResolvedValue([]);

      await service.getServices(null);

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { tenantId: null },
            { tenant: { isDefault: true } },
          ],
        },
        include: {
          category: true,
          addons: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getServiceById', () => {
    it('should return service with category and addons', async () => {
      const mockService = {
        id: 'srv-1',
        name: 'Cleaning',
        category: { id: 'cat-1' },
        addons: [],
      };
      prisma.service.findUnique.mockResolvedValue(mockService);

      const result = await service.getServiceById('srv-1');
      expect(result).toEqual(mockService);
    });

    it('should throw NotFoundException if service does not exist', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(service.getServiceById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createService', () => {
    it('should create service for a tenant if category exists', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Cleaning' });
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', name: 'Tenant 1' });
      prisma.service.findUnique.mockResolvedValue(null);
      prisma.service.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'srv-1', ...data }),
      );

      const result = await service.createService(
        {
          name: 'Home Cleaning',
          categoryId: 'cat-1',
          pricingType: ServicePricingType.HOURLY,
          baseUnitPrice: 100000,
          durationHours: 2,
        },
        'tenant-1',
      );

      expect(result.id).toBe('srv-1');
      expect(result.tenantId).toBe('tenant-1');
      expect(result.slug).toBe('home-cleaning');
    });

    it('should throw NotFoundException if category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.createService(
          {
            name: 'Home Cleaning',
            categoryId: 'invalid-cat',
            pricingType: ServicePricingType.HOURLY,
            baseUnitPrice: 100000,
          },
          'tenant-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleServiceActive', () => {
    it('should allow Super Admin to toggle platform-wide service (tenantId null)', async () => {
      const platformService = {
        id: 'srv-platform',
        name: 'Platform Service',
        tenantId: null,
        isActive: true,
        tenant: null,
      };
      prisma.service.findUnique.mockResolvedValue(platformService);
      prisma.service.update.mockResolvedValue({ ...platformService, isActive: false });

      const result = await service.toggleServiceActive('srv-platform', null, true);
      expect(result.isActive).toBe(false);
      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 'srv-platform' },
        data: { isActive: false },
        include: { category: true, addons: true },
      });
    });

    it('should forbid Tenant Admin from toggling platform-wide service', async () => {
      const platformService = {
        id: 'srv-platform',
        name: 'Platform Service',
        tenantId: null,
        isActive: true,
        tenant: null,
      };
      prisma.service.findUnique.mockResolvedValue(platformService);

      await expect(
        service.toggleServiceActive('srv-platform', 'tenant-123', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Tenant Admin to toggle their own service', async () => {
      const tenantService = {
        id: 'srv-tenant',
        name: 'Tenant Service',
        tenantId: 'tenant-123',
        isActive: true,
        tenant: { id: 'tenant-123', isDefault: false },
      };
      prisma.service.findUnique.mockResolvedValue(tenantService);
      prisma.service.update.mockResolvedValue({ ...tenantService, isActive: false });

      const result = await service.toggleServiceActive('srv-tenant', 'tenant-123', false);
      expect(result.isActive).toBe(false);
    });

    it('should forbid Tenant Admin from toggling another tenant service', async () => {
      const otherTenantService = {
        id: 'srv-other',
        name: 'Other Tenant Service',
        tenantId: 'other-tenant',
        isActive: true,
        tenant: { id: 'other-tenant', isDefault: false },
      };
      prisma.service.findUnique.mockResolvedValue(otherTenantService);

      await expect(
        service.toggleServiceActive('srv-other', 'tenant-123', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('calculatePrice', () => {
    it('should delegate calculation to PricingEngine', () => {
      const mockResult = {
        baseTotal: 200000,
        subtotal: 200000,
        surgeMultiplier: 1.0,
        surgeAmount: 0,
        discountAmount: 0,
        finalTotal: 200000,
      };
      pricingEngine.calculate.mockReturnValue(mockResult);

      const dto = {
        pricingType: ServicePricingType.HOURLY,
        baseUnitPrice: 100000,
        durationHours: 2,
      };
      const result = service.calculatePrice(dto);

      expect(pricingEngine.calculate).toHaveBeenCalledWith(dto);
      expect(result).toBe(mockResult);
    });
  });
});
