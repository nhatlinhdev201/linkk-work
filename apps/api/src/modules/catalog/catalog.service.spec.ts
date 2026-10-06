import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    service: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    addon: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    booking: {
      count: jest.Mock;
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
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      service: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      addon: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      booking: {
        count: jest.fn(),
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
    it('should return all active categories sorted by displayOrder when includeInactive is false', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Cleaning', isActive: true, displayOrder: 1 },
      ];
      prisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategories(false);
      expect(result).toEqual(mockCategories);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      });
    });

    it('should return all categories including inactive when includeInactive is true', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Cleaning', isActive: true, displayOrder: 1 },
        { id: 'cat-2', name: 'Inactive Cat', isActive: false, displayOrder: 2 },
      ];
      prisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategories(true);
      expect(result).toEqual(mockCategories);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { displayOrder: 'asc' },
      });
    });
  });

  describe('getCategoryById', () => {
    it('should return category when found', async () => {
      const mockCategory = { id: 'cat-1', name: 'Cleaning' };
      prisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.getCategoryById('cat-1');
      expect(result).toEqual(mockCategory);
      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
    });

    it('should throw NotFoundException if category not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.getCategoryById('not-found')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createCategory', () => {
    it('should create category with generated slug and default pricing fields', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockImplementation(({ data }) => Promise.resolve({ id: 'cat-1', ...data }));

      const result = await service.createCategory({
        name: 'Vệ sinh máy lạnh',
        description: 'Vệ sinh máy lạnh tại nhà',
        defaultPricingType: ServicePricingType.HOURLY,
        defaultBasePrice: 150000,
        defaultUnitLabel: 'máy',
      });

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          name: 'Vệ sinh máy lạnh',
          slug: 've-sinh-may-lanh',
          icon: null,
          description: 'Vệ sinh máy lạnh tại nhà',
          defaultPricingType: ServicePricingType.HOURLY,
          defaultBasePrice: 150000,
          defaultUnitLabel: 'máy',
          displayOrder: 0,
        },
      });
      expect(result.slug).toBe('ve-sinh-may-lanh');
    });

    it('should generate unique slug if slug collision occurs', async () => {
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

  describe('updateCategory', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCategory('cat-999', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update category fields successfully', async () => {
      const existing = {
        id: 'cat-1',
        name: 'Cleaning',
        slug: 'cleaning',
        description: 'Old desc',
        isActive: true,
      };
      prisma.category.findUnique.mockResolvedValue(existing);
      prisma.category.update.mockImplementation(({ data }) => Promise.resolve({ ...existing, ...data }));

      const result = await service.updateCategory('cat-1', {
        description: 'New desc',
        defaultBasePrice: 90000,
      });

      expect(result.description).toBe('New desc');
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: expect.objectContaining({
          description: 'New desc',
          defaultBasePrice: 90000,
        }),
      });
    });

    it('should ensure unique slug if slug is provided and collides', async () => {
      const existing = { id: 'cat-1', name: 'Cleaning', slug: 'cleaning' };
      prisma.category.findUnique.mockResolvedValue(existing);
      prisma.category.findFirst
        .mockResolvedValueOnce({ id: 'cat-2', slug: 'cleaning-pro' })
        .mockResolvedValueOnce(null);
      prisma.category.update.mockImplementation(({ data }) => Promise.resolve({ ...existing, ...data }));

      const result = await service.updateCategory('cat-1', {
        slug: 'cleaning-pro',
      });

      expect(result.slug).toBe('cleaning-pro-1');
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: expect.objectContaining({
          slug: 'cleaning-pro-1',
        }),
      });
    });
  });

  describe('deleteCategory', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.deleteCategory('cat-999')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if category has associated services', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Cleaning' });
      prisma.service.count.mockResolvedValue(3);

      await expect(service.deleteCategory('cat-1')).rejects.toThrow(BadRequestException);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('should delete category when it has 0 associated services', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Cleaning' });
      prisma.service.count.mockResolvedValue(0);
      prisma.category.delete.mockResolvedValue({ id: 'cat-1', name: 'Cleaning' });

      const result = await service.deleteCategory('cat-1');
      expect(result.id).toBe('cat-1');
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
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
          unitLabel: 'giờ',
          minHours: 1.5,
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

  describe('updateService', () => {
    it('should throw NotFoundException if service does not exist', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(
        service.updateService('srv-999', { name: 'Updated' }, null, true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if tenant admin attempts to edit platform service', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: 'srv-plat',
        tenantId: null,
      });

      await expect(
        service.updateService('srv-plat', { name: 'Platform Edit' }, 'tenant-1', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if tenant admin attempts to edit another tenant service', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: 'srv-other',
        tenantId: 'tenant-2',
      });

      await expect(
        service.updateService('srv-other', { name: 'Other Tenant Edit' }, 'tenant-1', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if categoryId provided does not exist', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: 'srv-1',
        tenantId: 'tenant-1',
      });
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.updateService('srv-1', { categoryId: 'cat-invalid' }, 'tenant-1', false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow Super Admin to update any service', async () => {
      const existing = {
        id: 'srv-1',
        name: 'Plumbing',
        slug: 'plumbing',
        tenantId: null,
      };
      prisma.service.findUnique.mockResolvedValue(existing);
      prisma.service.update.mockResolvedValue({
        ...existing,
        name: 'Plumbing Pro',
        category: { id: 'cat-1' },
        addons: [],
      });

      const result = await service.updateService(
        'srv-1',
        { name: 'Plumbing Pro', unitLabel: 'điểm', minHours: 2.0 },
        null,
        true,
      );

      expect(result.name).toBe('Plumbing Pro');
      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 'srv-1' },
        data: expect.objectContaining({
          name: 'Plumbing Pro',
          unitLabel: 'điểm',
          minHours: 2.0,
        }),
        include: {
          category: true,
          addons: true,
        },
      });
    });

    it('should allow matching Tenant Admin to update their service', async () => {
      const existing = {
        id: 'srv-tenant',
        name: 'Cleaning',
        slug: 'cleaning',
        tenantId: 'tenant-1',
      };
      prisma.service.findUnique.mockResolvedValue(existing);
      prisma.service.update.mockResolvedValue({
        ...existing,
        baseUnitPrice: 120000,
        category: { id: 'cat-1' },
        addons: [],
      });

      const result = await service.updateService(
        'srv-tenant',
        { baseUnitPrice: 120000 },
        'tenant-1',
        false,
      );

      expect(result.baseUnitPrice).toBe(120000);
    });
  });

  describe('deleteService', () => {
    it('should throw NotFoundException if service does not exist', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteService('srv-999', null, true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if tenant admin attempts to delete platform service', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: 'srv-plat',
        tenantId: null,
      });

      await expect(
        service.deleteService('srv-plat', 'tenant-1', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if tenant admin attempts to delete another tenant service', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: 'srv-other',
        tenantId: 'tenant-2',
      });

      await expect(
        service.deleteService('srv-other', 'tenant-1', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if service has associated bookings', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: 'srv-1',
        tenantId: 'tenant-1',
      });
      prisma.booking.count.mockResolvedValue(5);

      await expect(
        service.deleteService('srv-1', 'tenant-1', false),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.service.delete).not.toHaveBeenCalled();
    });

    it('should delete service when it has 0 bookings and user is authorized', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: 'srv-1',
        tenantId: 'tenant-1',
      });
      prisma.booking.count.mockResolvedValue(0);
      prisma.service.delete.mockResolvedValue({ id: 'srv-1' });

      const result = await service.deleteService('srv-1', 'tenant-1', false);
      expect(result.id).toBe('srv-1');
      expect(prisma.service.delete).toHaveBeenCalledWith({ where: { id: 'srv-1' } });
    });
  });

  describe('createAddon', () => {
    it('should throw NotFoundException if service does not exist', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(
        service.createAddon('srv-999', { name: 'Addon', price: 50000 }, null, true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if unauthorized tenant admin tries to add addon', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: 'srv-1',
        tenantId: 'tenant-2',
      });

      await expect(
        service.createAddon('srv-1', { name: 'Addon', price: 50000 }, 'tenant-1', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create addon under service when authorized', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: 'srv-1',
        tenantId: 'tenant-1',
      });
      prisma.addon.create.mockResolvedValue({
        id: 'add-1',
        serviceId: 'srv-1',
        name: 'Nano silver spray',
        price: 50000,
        description: 'Nano spray',
      });

      const result = await service.createAddon(
        'srv-1',
        { name: 'Nano silver spray', price: 50000, description: 'Nano spray' },
        'tenant-1',
        false,
      );

      expect(result.id).toBe('add-1');
      expect(prisma.addon.create).toHaveBeenCalledWith({
        data: {
          serviceId: 'srv-1',
          name: 'Nano silver spray',
          price: 50000,
          description: 'Nano spray',
        },
      });
    });
  });

  describe('updateAddon', () => {
    it('should throw NotFoundException if addon does not exist', async () => {
      prisma.addon.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAddon('add-999', { name: 'Updated' }, null, true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if unauthorized user tries to update addon', async () => {
      prisma.addon.findUnique.mockResolvedValue({
        id: 'add-1',
        service: { tenantId: 'tenant-2' },
      });

      await expect(
        service.updateAddon('add-1', { name: 'Updated' }, 'tenant-1', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update addon when authorized', async () => {
      prisma.addon.findUnique.mockResolvedValue({
        id: 'add-1',
        service: { tenantId: 'tenant-1' },
      });
      prisma.addon.update.mockResolvedValue({
        id: 'add-1',
        name: 'Updated Name',
        price: 60000,
      });

      const result = await service.updateAddon(
        'add-1',
        { name: 'Updated Name', price: 60000 },
        'tenant-1',
        false,
      );

      expect(result.name).toBe('Updated Name');
      expect(prisma.addon.update).toHaveBeenCalledWith({
        where: { id: 'add-1' },
        data: expect.objectContaining({
          name: 'Updated Name',
          price: 60000,
        }),
      });
    });
  });

  describe('deleteAddon', () => {
    it('should throw NotFoundException if addon does not exist', async () => {
      prisma.addon.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteAddon('add-999', null, true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if unauthorized user tries to delete addon', async () => {
      prisma.addon.findUnique.mockResolvedValue({
        id: 'add-1',
        service: { tenantId: 'tenant-2' },
      });

      await expect(
        service.deleteAddon('add-1', 'tenant-1', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete addon when authorized', async () => {
      prisma.addon.findUnique.mockResolvedValue({
        id: 'add-1',
        service: { tenantId: 'tenant-1' },
      });
      prisma.addon.delete.mockResolvedValue({ id: 'add-1' });

      const result = await service.deleteAddon('add-1', 'tenant-1', false);
      expect(result.id).toBe('add-1');
      expect(prisma.addon.delete).toHaveBeenCalledWith({ where: { id: 'add-1' } });
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

