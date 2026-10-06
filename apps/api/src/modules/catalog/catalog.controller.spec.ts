import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { ServicePricingType, UserRole } from '@linkkwork/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantContextGuard } from '../auth/guards/tenant-context.guard';

describe('CatalogController', () => {
  let controller: CatalogController;
  let catalogService: {
    getCategories: jest.Mock;
    getCategoryById: jest.Mock;
    createCategory: jest.Mock;
    updateCategory: jest.Mock;
    deleteCategory: jest.Mock;
    getServices: jest.Mock;
    getServiceById: jest.Mock;
    createService: jest.Mock;
    updateService: jest.Mock;
    deleteService: jest.Mock;
    createAddon: jest.Mock;
    updateAddon: jest.Mock;
    deleteAddon: jest.Mock;
    toggleServiceActive: jest.Mock;
    calculatePrice: jest.Mock;
  };

  beforeEach(async () => {
    catalogService = {
      getCategories: jest.fn(),
      getCategoryById: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      getServices: jest.fn(),
      getServiceById: jest.fn(),
      createService: jest.fn(),
      updateService: jest.fn(),
      deleteService: jest.fn(),
      createAddon: jest.fn(),
      updateAddon: jest.fn(),
      deleteAddon: jest.fn(),
      toggleServiceActive: jest.fn(),
      calculatePrice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        { provide: CatalogService, useValue: catalogService },
        { provide: PrismaService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantContextGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CatalogController>(CatalogController);
  });

  describe('getCategories', () => {
    it('should return active categories when all is not true', async () => {
      catalogService.getCategories.mockResolvedValue([{ id: 'cat-1', name: 'Cleaning' }]);
      const res = await controller.getCategories();
      expect(res).toEqual([{ id: 'cat-1', name: 'Cleaning' }]);
      expect(catalogService.getCategories).toHaveBeenCalledWith(false);
    });

    it('should return all categories when all is true', async () => {
      catalogService.getCategories.mockResolvedValue([
        { id: 'cat-1', name: 'Cleaning' },
        { id: 'cat-2', name: 'Inactive' },
      ]);
      const res = await controller.getCategories('true');
      expect(res).toHaveLength(2);
      expect(catalogService.getCategories).toHaveBeenCalledWith(true);
    });
  });

  describe('getCategoryById', () => {
    it('should return category by ID', async () => {
      catalogService.getCategoryById.mockResolvedValue({ id: 'cat-1', name: 'Cleaning' });
      const res = await controller.getCategoryById('cat-1');
      expect(res).toEqual({ id: 'cat-1', name: 'Cleaning' });
      expect(catalogService.getCategoryById).toHaveBeenCalledWith('cat-1');
    });
  });

  describe('createCategory', () => {
    it('should create category', async () => {
      catalogService.createCategory.mockResolvedValue({ id: 'cat-1', name: 'Cleaning' });
      const res = await controller.createCategory({ name: 'Cleaning' });
      expect(res).toEqual({ id: 'cat-1', name: 'Cleaning' });
      expect(catalogService.createCategory).toHaveBeenCalledWith({ name: 'Cleaning' });
    });
  });

  describe('updateCategory', () => {
    it('should update category', async () => {
      catalogService.updateCategory.mockResolvedValue({ id: 'cat-1', name: 'Cleaning Pro' });
      const res = await controller.updateCategory('cat-1', { name: 'Cleaning Pro' });
      expect(res).toEqual({ id: 'cat-1', name: 'Cleaning Pro' });
      expect(catalogService.updateCategory).toHaveBeenCalledWith('cat-1', { name: 'Cleaning Pro' });
    });
  });

  describe('deleteCategory', () => {
    it('should delete category', async () => {
      catalogService.deleteCategory.mockResolvedValue({ id: 'cat-1' });
      const res = await controller.deleteCategory('cat-1');
      expect(res).toEqual({ id: 'cat-1' });
      expect(catalogService.deleteCategory).toHaveBeenCalledWith('cat-1');
    });
  });

  describe('getServices', () => {
    it('should pass req.tenantId to service.getServices', async () => {
      catalogService.getServices.mockResolvedValue([]);
      const req = { tenantId: 'tenant-123' };

      await controller.getServices(req as unknown as Parameters<typeof controller.getServices>[0]);
      expect(catalogService.getServices).toHaveBeenCalledWith('tenant-123');
    });
  });

  describe('getServiceById', () => {
    it('should return service by ID', async () => {
      catalogService.getServiceById.mockResolvedValue({ id: 'srv-1', name: 'Cleaning' });
      const res = await controller.getServiceById('srv-1');
      expect(res).toEqual({ id: 'srv-1', name: 'Cleaning' });
      expect(catalogService.getServiceById).toHaveBeenCalledWith('srv-1');
    });
  });

  describe('createService', () => {
    it('should pass null tenantId for superadmin when not impersonating', async () => {
      catalogService.createService.mockResolvedValue({ id: 'srv-1' });
      const user = { id: 'usr-1', isSuperAdmin: true, role: UserRole.SUPER_ADMIN, tenantId: 'platform-tenant' };
      const req = { tenantId: 'platform-tenant', isImpersonating: false };
      const dto = {
        name: 'Plumbing',
        categoryId: 'cat-1',
        pricingType: ServicePricingType.HOURLY,
        baseUnitPrice: 100000,
      };

      await controller.createService(
        dto,
        user as unknown as Parameters<typeof controller.createService>[1],
        req as unknown as Parameters<typeof controller.createService>[2],
      );
      expect(catalogService.createService).toHaveBeenCalledWith(dto, null);
    });

    it('should pass req.tenantId when impersonating or for normal tenant admin', async () => {
      catalogService.createService.mockResolvedValue({ id: 'srv-2' });
      const user = { id: 'usr-2', isSuperAdmin: false, role: UserRole.TENANT_ADMIN, tenantId: 'tenant-456' };
      const req = { tenantId: 'tenant-456', isImpersonating: false };
      const dto = {
        name: 'Plumbing',
        categoryId: 'cat-1',
        pricingType: ServicePricingType.HOURLY,
        baseUnitPrice: 100000,
      };

      await controller.createService(
        dto,
        user as unknown as Parameters<typeof controller.createService>[1],
        req as unknown as Parameters<typeof controller.createService>[2],
      );
      expect(catalogService.createService).toHaveBeenCalledWith(dto, 'tenant-456');
    });

    it('should throw ForbiddenException if user is not superadmin and has no effective tenant context', async () => {
      const user = { id: 'usr-3', isSuperAdmin: false, role: UserRole.TENANT_ADMIN, tenantId: null };
      const req = { tenantId: null, isImpersonating: false };
      const dto = {
        name: 'Plumbing',
        categoryId: 'cat-1',
        pricingType: ServicePricingType.HOURLY,
        baseUnitPrice: 100000,
      };

      await expect(
        controller.createService(
          dto,
          user as unknown as Parameters<typeof controller.createService>[1],
          req as unknown as Parameters<typeof controller.createService>[2],
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateService', () => {
    it('should call service.updateService with effective context', async () => {
      catalogService.updateService.mockResolvedValue({ id: 'srv-1', name: 'Updated' });
      const user = { id: 'usr-1', isSuperAdmin: false, role: UserRole.TENANT_ADMIN, tenantId: 'tenant-1' };
      const req = { tenantId: 'tenant-1' };
      const dto = { name: 'Updated' };

      const res = await controller.updateService(
        'srv-1',
        dto,
        user as unknown as Parameters<typeof controller.updateService>[2],
        req as unknown as Parameters<typeof controller.updateService>[3],
      );

      expect(res).toEqual({ id: 'srv-1', name: 'Updated' });
      expect(catalogService.updateService).toHaveBeenCalledWith('srv-1', dto, 'tenant-1', false);
    });
  });

  describe('deleteService', () => {
    it('should call service.deleteService with effective context', async () => {
      catalogService.deleteService.mockResolvedValue({ id: 'srv-1' });
      const user = { id: 'usr-1', isSuperAdmin: true, role: UserRole.SUPER_ADMIN, tenantId: 'tenant-1' };
      const req = { tenantId: 'tenant-1' };

      const res = await controller.deleteService(
        'srv-1',
        user as unknown as Parameters<typeof controller.deleteService>[1],
        req as unknown as Parameters<typeof controller.deleteService>[2],
      );

      expect(res).toEqual({ id: 'srv-1' });
      expect(catalogService.deleteService).toHaveBeenCalledWith('srv-1', 'tenant-1', true);
    });
  });

  describe('createAddon', () => {
    it('should call service.createAddon with dto and context', async () => {
      catalogService.createAddon.mockResolvedValue({ id: 'add-1' });
      const user = { id: 'usr-1', isSuperAdmin: false, role: UserRole.TENANT_ADMIN, tenantId: 'tenant-1' };
      const req = { tenantId: 'tenant-1' };
      const dto = { name: 'Spray', price: 50000 };

      const res = await controller.createAddon(
        'srv-1',
        dto,
        user as unknown as Parameters<typeof controller.createAddon>[2],
        req as unknown as Parameters<typeof controller.createAddon>[3],
      );

      expect(res).toEqual({ id: 'add-1' });
      expect(catalogService.createAddon).toHaveBeenCalledWith('srv-1', dto, 'tenant-1', false);
    });
  });

  describe('updateAddon', () => {
    it('should call service.updateAddon with dto and context', async () => {
      catalogService.updateAddon.mockResolvedValue({ id: 'add-1', price: 60000 });
      const user = { id: 'usr-1', isSuperAdmin: false, role: UserRole.TENANT_ADMIN, tenantId: 'tenant-1' };
      const req = { tenantId: 'tenant-1' };
      const dto = { price: 60000 };

      const res = await controller.updateAddon(
        'add-1',
        dto,
        user as unknown as Parameters<typeof controller.updateAddon>[2],
        req as unknown as Parameters<typeof controller.updateAddon>[3],
      );

      expect(res).toEqual({ id: 'add-1', price: 60000 });
      expect(catalogService.updateAddon).toHaveBeenCalledWith('add-1', dto, 'tenant-1', false);
    });
  });

  describe('deleteAddon', () => {
    it('should call service.deleteAddon with context', async () => {
      catalogService.deleteAddon.mockResolvedValue({ id: 'add-1' });
      const user = { id: 'usr-1', isSuperAdmin: true, role: UserRole.SUPER_ADMIN, tenantId: null };
      const req = { tenantId: null };

      const res = await controller.deleteAddon(
        'add-1',
        user as unknown as Parameters<typeof controller.deleteAddon>[1],
        req as unknown as Parameters<typeof controller.deleteAddon>[2],
      );

      expect(res).toEqual({ id: 'add-1' });
      expect(catalogService.deleteAddon).toHaveBeenCalledWith('add-1', null, true);
    });
  });

  describe('toggleServiceActive', () => {
    it('should call service.toggleServiceActive with user context', async () => {
      catalogService.toggleServiceActive.mockResolvedValue({ id: 'srv-1', isActive: false });
      const user = { id: 'usr-1', isSuperAdmin: true, role: UserRole.SUPER_ADMIN, tenantId: 'plat-1' };
      const req = { tenantId: 'plat-1' };

      const res = await controller.toggleServiceActive(
        'srv-1',
        {},
        user as unknown as Parameters<typeof controller.toggleServiceActive>[2],
        req as unknown as Parameters<typeof controller.toggleServiceActive>[3],
      );
      expect(res).toEqual({ id: 'srv-1', isActive: false });
      expect(catalogService.toggleServiceActive).toHaveBeenCalledWith('srv-1', 'plat-1', true, undefined);
    });
  });

  describe('calculatePrice', () => {
    it('should delegate to catalogService.calculatePrice', () => {
      const mockResult = {
        baseTotal: 200000,
        subtotal: 200000,
        surgeMultiplier: 1.0,
        surgeAmount: 0,
        discountAmount: 0,
        finalTotal: 200000,
      };
      catalogService.calculatePrice.mockReturnValue(mockResult);

      const dto = {
        pricingType: ServicePricingType.HOURLY,
        baseUnitPrice: 100000,
        durationHours: 2,
      };
      const res = controller.calculatePrice(dto);
      expect(res).toBe(mockResult);
      expect(catalogService.calculatePrice).toHaveBeenCalledWith(dto);
    });
  });
});

