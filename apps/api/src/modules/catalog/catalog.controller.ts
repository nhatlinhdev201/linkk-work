import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { ToggleServiceDto } from './dto/toggle-service.dto';
import { CalculatePriceDto } from './dto/calculate-price.dto';
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
  @ApiOperation({ summary: 'List all active service categories' })
  async getCategories() {
    return this.catalogService.getCategories();
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new service category (Super Admin only)' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
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
