import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { RegisterPartnerDto } from './dto/register-partner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantContextGuard } from '../auth/guards/tenant-context.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { UserRole } from '@linkkwork/shared-types';
import { Request } from 'express';

interface RequestWithTenant extends Request {
  tenantId?: string | null;
  isImpersonating?: boolean;
}

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all tenants with tasker and booking counts (Super Admin only)' })
  async getTenants() {
    return this.tenantsService.getTenants();
  }

  @Post('register')
  @ApiOperation({ summary: 'Self-service partner onboarding registration (Public)' })
  async registerPartner(@Body() dto: RegisterPartnerDto) {
    return this.tenantsService.registerPartner(dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant details by ID' })
  async getTenantById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithTenant,
  ) {
    const isSuperAdmin = user.isSuperAdmin === true || user.role === UserRole.SUPER_ADMIN;

    if (!isSuperAdmin && !req.isImpersonating && user.tenantId !== id) {
      throw new ForbiddenException('Cannot access other tenant details');
    }

    return this.tenantsService.getTenantById(id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a partner tenant and set status to ACTIVE (Super Admin only)' })
  async approveTenant(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantsService.approveTenant(id, user.id);
  }
}
