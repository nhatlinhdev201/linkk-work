import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '@linkkwork/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantContextGuard } from '../auth/guards/tenant-context.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { FinanceService } from './finance.service';
import {
  QueryFinancialSummaryDto,
  QueryTransactionsDto,
} from './dto/query-transactions.dto';

interface RequestWithTenant extends Request {
  tenantId?: string | null;
  isImpersonating?: boolean;
}

@ApiTags('Finance & Universal Ledger')
@ApiBearerAuth()
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard, TenantContextGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.TENANT_DISPATCHER)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('transactions')
  @ApiOperation({ summary: 'Truy vấn sổ cái kế toán toàn sàn có phân quyền Tenant' })
  async getTransactions(
    @Query() query: QueryTransactionsDto,
    @Req() req: RequestWithTenant,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSuperAdmin =
      user?.isSuperAdmin === true || user?.role === UserRole.SUPER_ADMIN;
    const effectiveTenantId = req.isImpersonating
      ? (req.tenantId || null)
      : (isSuperAdmin ? null : (req.tenantId || user?.tenantId || null));

    return this.financeService.getTransactions(
      query,
      effectiveTenantId,
      isSuperAdmin,
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Thống kê tổng quan tài chính thời gian thực' })
  async getFinancialSummary(
    @Query() query: QueryFinancialSummaryDto,
    @Req() req: RequestWithTenant,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSuperAdmin =
      user?.isSuperAdmin === true || user?.role === UserRole.SUPER_ADMIN;
    const effectiveTenantId = req.isImpersonating
      ? (req.tenantId || null)
      : (isSuperAdmin ? null : (req.tenantId || user?.tenantId || null));

    return this.financeService.getFinancialSummary(
      query.tenantId,
      effectiveTenantId,
      isSuperAdmin,
    );
  }
}
