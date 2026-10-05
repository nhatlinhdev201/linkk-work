import { Test, TestingModule } from '@nestjs/testing';
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
    createCategory: jest.Mock;
    getServices: jest.Mock;
    getServiceById: jest.Mock;
    createService: jest.Mock;
    toggleServiceActive: jest.Mock;
    calculatePrice: jest.Mock;
  };

  beforeEach(async () => {
    catalogService = {
      getCategories: jest.fn(),
      createCategory: jest.fn(),
      getServices: jest.fn(),
      getServiceById: jest.fn(),
      createService: jest.fn(),
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
    it('should return categories from service', async () => {
      catalogService.getCategories.mockResolvedValue([{ id: 'cat-1', name: 'Cleaning' }]);
      const res = await controller.getCategories();
      expect(res).toEqual([{ id: 'cat-1', name: 'Cleaning' }]);
      expect(catalogService.getCategories).toHaveBeenCalled();
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
