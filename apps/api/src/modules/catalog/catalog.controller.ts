import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { CatalogService } from './catalog.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateServiceDto,
  UpdateServiceDto,
  CreateAddonDto,
  UpdateAddonDto,
  ToggleServiceDto,
  CalculatePriceDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantContextGuard } from '../auth/guards/tenant-context.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { UserRole } from '@linkkwork/shared-types';

interface RequestWithTenant extends Request {
  tenantId?: string | null;
  isImpersonating?: boolean;
}

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List service categories' })
  @ApiQuery({ name: 'all', required: false, type: Boolean, description: 'Set true to include inactive categories' })
  async getCategories(@Query('all') all?: string) {
    const includeInactive = all === 'true';
    return this.catalogService.getCategories(includeInactive);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get category details by ID' })
  async getCategoryById(@Param('id') id: string) {
    return this.catalogService.getCategoryById(id);
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new service category (Super Admin only)' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a service category (Super Admin only)' })
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.catalogService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a service category (Super Admin only)' })
  async deleteCategory(@Param('id') id: string) {
    return this.catalogService.deleteCategory(id);
  }

  @Get('services')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List services for current tenant or platform' })
  async getServices(@Req() req: RequestWithTenant) {
    return this.catalogService.getServices(req.tenantId ?? null);
  }

  @Get('services/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get service details by ID' })
  async getServiceById(@Param('id') id: string) {
    return this.catalogService.getServiceById(id);
  }

  @Post('services')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new service for tenant or platform' })
  async createService(
    @Body() dto: CreateServiceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithTenant,
  ) {
    const isSuperAdmin = user?.isSuperAdmin === true || user?.role === UserRole.SUPER_ADMIN;
    const effectiveTenantId = req.isImpersonating
      ? (req.tenantId ?? null)
      : isSuperAdmin
        ? null
        : (req.tenantId ?? user?.tenantId ?? null);

    return this.catalogService.createService(dto, effectiveTenantId);
  }

  @Patch('services/:id')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a service' })
  async updateService(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithTenant,
  ) {
    const isSuperAdmin = user?.isSuperAdmin === true || user?.role === UserRole.SUPER_ADMIN;
    const currentTenantId = req.tenantId ?? user?.tenantId ?? null;
    return this.catalogService.updateService(id, dto, currentTenantId, isSuperAdmin);
  }

  @Delete('services/:id')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a service' })
  async deleteService(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithTenant,
  ) {
    const isSuperAdmin = user?.isSuperAdmin === true || user?.role === UserRole.SUPER_ADMIN;
    const currentTenantId = req.tenantId ?? user?.tenantId ?? null;
    return this.catalogService.deleteService(id, currentTenantId, isSuperAdmin);
  }

  @Post('services/:id/addons')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an addon for a service' })
  async createAddon(
    @Param('id') serviceId: string,
    @Body() dto: CreateAddonDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithTenant,
  ) {
    const isSuperAdmin = user?.isSuperAdmin === true || user?.role === UserRole.SUPER_ADMIN;
    const currentTenantId = req.tenantId ?? user?.tenantId ?? null;
    return this.catalogService.createAddon(serviceId, dto, currentTenantId, isSuperAdmin);
  }

  @Patch('addons/:id')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an addon' })
  async updateAddon(
    @Param('id') id: string,
    @Body() dto: UpdateAddonDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithTenant,
  ) {
    const isSuperAdmin = user?.isSuperAdmin === true || user?.role === UserRole.SUPER_ADMIN;
    const currentTenantId = req.tenantId ?? user?.tenantId ?? null;
    return this.catalogService.updateAddon(id, dto, currentTenantId, isSuperAdmin);
  }

  @Delete('addons/:id')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an addon' })
  async deleteAddon(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithTenant,
  ) {
    const isSuperAdmin = user?.isSuperAdmin === true || user?.role === UserRole.SUPER_ADMIN;
    const currentTenantId = req.tenantId ?? user?.tenantId ?? null;
    return this.catalogService.deleteAddon(id, currentTenantId, isSuperAdmin);
  }

  @Patch('services/:id/toggle')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle service active status' })
  async toggleServiceActive(
    @Param('id') id: string,
    @Body() body: ToggleServiceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithTenant,
  ) {
    const isSuperAdmin = user?.isSuperAdmin === true || user?.role === UserRole.SUPER_ADMIN;
    const currentTenantId = req.tenantId ?? user?.tenantId ?? null;
    return this.catalogService.toggleServiceActive(id, currentTenantId, isSuperAdmin, body?.isActive);
  }

  @Post('calculate-price')
  @ApiOperation({ summary: 'Calculate dynamic pricing for a service quote' })
  calculatePrice(@Body() dto: CalculatePriceDto) {
    return this.catalogService.calculatePrice(dto);
  }
}

