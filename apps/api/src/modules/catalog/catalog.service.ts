import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PricingEngine } from './pricing.engine';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { CalculatePriceDto } from './dto/calculate-price.dto';
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
   * Returns all active service categories ordered by displayOrder ascending.
   */
  async getCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Creates a service category with unique slug generation.
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
        displayOrder: dto.displayOrder ?? 0,
      },
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
