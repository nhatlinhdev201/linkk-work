import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PricingEngine } from './pricing.engine';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateServiceDto,
  UpdateServiceDto,
  CreateAddonDto,
  UpdateAddonDto,
  CalculatePriceDto,
} from './dto';
import { PricingCalculationResult } from '@linkkwork/shared-types';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingEngine: PricingEngine,
  ) {}

  /**
   * Returns service categories ordered by displayOrder ascending.
   * If includeInactive is false, filters by isActive: true.
   */
  async getCategories(includeInactive: boolean = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.category.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Returns a single category by ID.
   */
  async getCategoryById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  /**
   * Creates a service category with unique slug generation and default pricing fields.
   */
  async createCategory(dto: CreateCategoryDto) {
    const baseSlug = slugify(dto.slug || dto.name);
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (await this.prisma.category.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: uniqueSlug,
        icon: dto.icon || null,
        description: dto.description ?? null,
        defaultPricingType: dto.defaultPricingType ?? 'HOURLY',
        defaultBasePrice: dto.defaultBasePrice ?? 80000,
        defaultUnitLabel: dto.defaultUnitLabel ?? 'giờ',
        displayOrder: dto.displayOrder ?? 0,
      },
    });
  }

  /**
   * Updates an existing category, handling slug uniqueness if slug or name changed.
   */
  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    let finalSlug = category.slug;
    if (dto.slug || (dto.name && dto.name !== category.name)) {
      const baseSlug = slugify(dto.slug || dto.name!);
      let uniqueSlug = baseSlug;
      let counter = 1;

      while (
        await this.prisma.category.findFirst({
          where: { slug: uniqueSlug, NOT: { id } },
        })
      ) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      finalSlug = uniqueSlug;
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(finalSlug !== category.slug && { slug: finalSlug }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.defaultPricingType !== undefined && { defaultPricingType: dto.defaultPricingType }),
        ...(dto.defaultBasePrice !== undefined && { defaultBasePrice: dto.defaultBasePrice }),
        ...(dto.defaultUnitLabel !== undefined && { defaultUnitLabel: dto.defaultUnitLabel }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * Deletes a category if it has no associated services.
   */
  async deleteCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const serviceCount = await this.prisma.service.count({
      where: { categoryId: id },
    });

    if (serviceCount > 0) {
      throw new BadRequestException(
        'Cannot delete category with associated services. Please reassign or delete services first.',
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }

  /**
   * Returns services scoped to the current tenant or platform-wide (tenantId = null or default tenant).
   */
  async getServices(currentTenantId: string | null) {
    const whereClause = currentTenantId
      ? {
          OR: [
            { tenantId: null },
            { tenantId: currentTenantId },
            { tenant: { isDefault: true } },
          ],
        }
      : {
          OR: [
            { tenantId: null },
            { tenant: { isDefault: true } },
          ],
        };

    return this.prisma.service.findMany({
      where: whereClause,
      include: {
        category: true,
        addons: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Returns a single service by ID including its category and add-ons.
   */
  async getServiceById(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        addons: true,
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  /**
   * Creates a new service for the specified tenant (or null if platform-wide).
   */
  async createService(dto: CreateServiceDto, tenantId: string | null) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${dto.categoryId} not found`);
    }

    if (tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      if (!tenant) {
        throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
      }
    }

    const baseSlug = slugify(dto.slug || dto.name);
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (await this.prisma.service.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    return this.prisma.service.create({
      data: {
        name: dto.name,
        slug: uniqueSlug,
        categoryId: dto.categoryId,
        pricingType: dto.pricingType,
        baseUnitPrice: dto.baseUnitPrice,
        durationHours: dto.durationHours ?? null,
        unitLabel: dto.unitLabel ?? 'giờ',
        minHours: dto.minHours ?? 1.0,
        description: dto.description ?? null,
        tenantId: tenantId ?? null,
        isActive: true,
      },
      include: {
        category: true,
        addons: true,
      },
    });
  }

  /**
   * Updates an existing service with permission check and category verification.
   */
  async updateService(
    id: string,
    dto: UpdateServiceDto,
    currentTenantId: string | null,
    isSuperAdmin: boolean,
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: { tenant: true },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    const isPlatformService = !service.tenantId || service.tenant?.isDefault === true;

    if (isPlatformService) {
      if (!isSuperAdmin) {
        throw new ForbiddenException('Tenant admins cannot modify platform-wide services');
      }
    } else {
      if (!isSuperAdmin && service.tenantId !== currentTenantId) {
        throw new ForbiddenException('You can only modify services belonging to your tenant');
      }
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${dto.categoryId} not found`);
      }
    }

    let finalSlug = service.slug;
    if (dto.slug || (dto.name && dto.name !== service.name)) {
      const baseSlug = slugify(dto.slug || dto.name!);
      let uniqueSlug = baseSlug;
      let counter = 1;

      while (
        await this.prisma.service.findFirst({
          where: { slug: uniqueSlug, NOT: { id } },
        })
      ) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      finalSlug = uniqueSlug;
    }

    return this.prisma.service.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(finalSlug !== service.slug && { slug: finalSlug }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.pricingType !== undefined && { pricingType: dto.pricingType }),
        ...(dto.baseUnitPrice !== undefined && { baseUnitPrice: dto.baseUnitPrice }),
        ...(dto.durationHours !== undefined && { durationHours: dto.durationHours }),
        ...(dto.unitLabel !== undefined && { unitLabel: dto.unitLabel }),
        ...(dto.minHours !== undefined && { minHours: dto.minHours }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        category: true,
        addons: true,
      },
    });
  }

  /**
   * Deletes a service if user has permission and service has no booking records.
   */
  async deleteService(
    id: string,
    currentTenantId: string | null,
    isSuperAdmin: boolean,
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: { tenant: true },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    const isPlatformService = !service.tenantId || service.tenant?.isDefault === true;

    if (isPlatformService) {
      if (!isSuperAdmin) {
        throw new ForbiddenException('Tenant admins cannot delete platform-wide services');
      }
    } else {
      if (!isSuperAdmin && service.tenantId !== currentTenantId) {
        throw new ForbiddenException('You can only delete services belonging to your tenant');
      }
    }

    const bookingCount = await this.prisma.booking.count({
      where: { serviceId: id },
    });

    if (bookingCount > 0) {
      throw new BadRequestException(
        'Cannot delete service that has booking records. Please deactivate it instead.',
      );
    }

    return this.prisma.service.delete({
      where: { id },
    });
  }

  /**
   * Creates an addon under a service.
   */
  async createAddon(
    serviceId: string,
    dto: CreateAddonDto,
    currentTenantId: string | null,
    isSuperAdmin: boolean,
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { tenant: true },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }

    const isPlatformService = !service.tenantId || service.tenant?.isDefault === true;

    if (isPlatformService) {
      if (!isSuperAdmin) {
        throw new ForbiddenException('Tenant admins cannot modify platform-wide services');
      }
    } else {
      if (!isSuperAdmin && service.tenantId !== currentTenantId) {
        throw new ForbiddenException('You can only modify services belonging to your tenant');
      }
    }

    return this.prisma.addon.create({
      data: {
        serviceId,
        name: dto.name,
        price: dto.price,
        description: dto.description ?? null,
      },
    });
  }

  /**
   * Updates an addon after checking service permissions.
   */
  async updateAddon(
    id: string,
    dto: UpdateAddonDto,
    currentTenantId: string | null,
    isSuperAdmin: boolean,
  ) {
    const addon = await this.prisma.addon.findUnique({
      where: { id },
      include: {
        service: {
          include: { tenant: true },
        },
      },
    });

    if (!addon) {
      throw new NotFoundException(`Addon with ID ${id} not found`);
    }

    const service = addon.service;
    const isPlatformService = !service.tenantId || service.tenant?.isDefault === true;

    if (isPlatformService) {
      if (!isSuperAdmin) {
        throw new ForbiddenException('Tenant admins cannot modify platform-wide services');
      }
    } else {
      if (!isSuperAdmin && service.tenantId !== currentTenantId) {
        throw new ForbiddenException('You can only modify services belonging to your tenant');
      }
    }

    return this.prisma.addon.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * Deletes an addon after checking service permissions.
   */
  async deleteAddon(
    id: string,
    currentTenantId: string | null,
    isSuperAdmin: boolean,
  ) {
    const addon = await this.prisma.addon.findUnique({
      where: { id },
      include: {
        service: {
          include: { tenant: true },
        },
      },
    });

    if (!addon) {
      throw new NotFoundException(`Addon with ID ${id} not found`);
    }

    const service = addon.service;
    const isPlatformService = !service.tenantId || service.tenant?.isDefault === true;

    if (isPlatformService) {
      if (!isSuperAdmin) {
        throw new ForbiddenException('Tenant admins cannot modify platform-wide services');
      }
    } else {
      if (!isSuperAdmin && service.tenantId !== currentTenantId) {
        throw new ForbiddenException('You can only modify services belonging to your tenant');
      }
    }

    return this.prisma.addon.delete({
      where: { id },
    });
  }

  /**
   * Toggles the active status of a service.
   * Super Admin can toggle platform-wide services or any tenant service.
   * Tenant Admin can only toggle their tenant's services.
   */
  async toggleServiceActive(
    id: string,
    currentTenantId: string | null,
    isSuperAdmin: boolean,
    targetActive?: boolean,
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: { tenant: true },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    const isPlatformService = !service.tenantId || service.tenant?.isDefault === true;

    if (isPlatformService) {
      if (!isSuperAdmin) {
        throw new ForbiddenException('Tenant admins cannot modify platform-wide services');
      }
    } else {
      if (!isSuperAdmin && service.tenantId !== currentTenantId) {
        throw new ForbiddenException('You can only modify services belonging to your tenant');
      }
    }

    const nextActive = typeof targetActive === 'boolean' ? targetActive : !service.isActive;

    return this.prisma.service.update({
      where: { id },
      data: { isActive: nextActive },
      include: {
        category: true,
        addons: true,
      },
    });
  }

  /**
   * Calculates pricing dynamically using the PricingEngine.
   */
  calculatePrice(dto: CalculatePriceDto): PricingCalculationResult {
    return this.pricingEngine.calculate(dto);
  }
}

