import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { TaskerService } from './tasker.service';
import {
  AdjustDepositDto,
  CreateTaskerDto,
  QueryTaskersDto,
  UpdateKycDto,
  UpdateTaskerDto,
  UpdateWorkFloorDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantContextGuard } from '../auth/guards/tenant-context.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { UserRole } from '@linkkwork/shared-types';

interface RequestWithAuth extends Request {
  effectiveTenantId?: string | null;
  tenantId?: string | null;
  isImpersonating?: boolean;
  user?: AuthenticatedUser;
}

function extractRequestContext(req: RequestWithAuth) {
  const effectiveTenantId =
    req.effectiveTenantId || req.tenantId || req.user?.tenantId || null;
  const isSuperAdmin =
    req.user?.isSuperAdmin === true || req.user?.role === UserRole.SUPER_ADMIN;
  const userId = req.user?.id || 'SYSTEM';

  return { effectiveTenantId, isSuperAdmin, userId };
}

@ApiTags('Taskers & HRM')
@ApiBearerAuth()
@Controller('taskers')
@UseGuards(JwtAuthGuard, RolesGuard, TenantContextGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
export class TaskerController {
  constructor(private readonly taskerService: TaskerService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo tài khoản và hồ sơ thợ mới' })
  async createTasker(@Body() dto: CreateTaskerDto, @Req() req: RequestWithAuth) {
    const { effectiveTenantId, isSuperAdmin } = extractRequestContext(req);
    return this.taskerService.createTasker(dto, effectiveTenantId, isSuperAdmin);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thợ với bộ lọc và phân trang' })
  async getTaskers(
    @Query() query: QueryTaskersDto,
    @Req() req: RequestWithAuth,
  ) {
    const { effectiveTenantId, isSuperAdmin } = extractRequestContext(req);

    const isOnline =
      query.isOnline === 'true'
        ? true
        : query.isOnline === 'false'
          ? false
          : undefined;

    const kycVerified =
      query.kycVerified === 'true'
        ? true
        : query.kycVerified === 'false'
          ? false
          : undefined;

    const lowDepositOnly =
      query.lowDepositOnly === 'true'
        ? true
        : query.lowDepositOnly === 'false'
          ? false
          : undefined;

    const page = query.page !== undefined ? Number(query.page) : undefined;
    const limit = query.limit !== undefined ? Number(query.limit) : undefined;

    return this.taskerService.getTaskers(
      {
        tenantId: query.tenantId,
        search: query.search,
        isOnline,
        kycVerified,
        lowDepositOnly,
        page,
        limit,
      },
      effectiveTenantId,
      isSuperAdmin,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết thợ' })
  async getTaskerById(@Param('id') id: string, @Req() req: RequestWithAuth) {
    const { effectiveTenantId, isSuperAdmin } = extractRequestContext(req);
    return this.taskerService.getTaskerById(id, effectiveTenantId, isSuperAdmin);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin thợ' })
  async updateTasker(
    @Param('id') id: string,
    @Body() dto: UpdateTaskerDto,
    @Req() req: RequestWithAuth,
  ) {
    const { effectiveTenantId, isSuperAdmin } = extractRequestContext(req);
    return this.taskerService.updateTasker(id, dto, effectiveTenantId, isSuperAdmin);
  }

  @Patch(':id/work-floor')
  @ApiOperation({ summary: 'Cập nhật sàn làm việc và radar của thợ' })
  async updateWorkFloor(
    @Param('id') id: string,
    @Body() dto: UpdateWorkFloorDto,
    @Req() req: RequestWithAuth,
  ) {
    const { effectiveTenantId, isSuperAdmin } = extractRequestContext(req);
    return this.taskerService.updateWorkFloor(id, dto, effectiveTenantId, isSuperAdmin);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Bật / tắt trạng thái trực tuyến của thợ' })
  async toggleOnlineStatus(
    @Param('id') id: string,
    @Req() req: RequestWithAuth,
  ) {
    const { effectiveTenantId, isSuperAdmin } = extractRequestContext(req);
    return this.taskerService.toggleOnlineStatus(id, effectiveTenantId, isSuperAdmin);
  }

  @Post(':id/deposit')
  @ApiOperation({ summary: 'Điều chỉnh số dư ký quỹ (nạp / khấu trừ)' })
  async adjustDeposit(
    @Param('id') id: string,
    @Body() dto: AdjustDepositDto,
    @Req() req: RequestWithAuth,
  ) {
    const { effectiveTenantId, isSuperAdmin, userId } = extractRequestContext(req);
    return this.taskerService.adjustDeposit(
      id,
      dto,
      effectiveTenantId,
      isSuperAdmin,
      userId,
    );
  }

  @Patch(':id/kyc')
  @ApiOperation({ summary: 'Cập nhật trạng thái KYC của thợ' })
  async updateKyc(
    @Param('id') id: string,
    @Body() dto: UpdateKycDto,
    @Req() req: RequestWithAuth,
  ) {
    const { effectiveTenantId, isSuperAdmin } = extractRequestContext(req);
    return this.taskerService.updateKyc(id, dto, effectiveTenantId, isSuperAdmin);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Lịch sử giao dịch ký quỹ của thợ' })
  async getTaskerTransactions(
    @Param('id') id: string,
    @Req() req: RequestWithAuth,
  ) {
    const { effectiveTenantId, isSuperAdmin } = extractRequestContext(req);
    return this.taskerService.getTaskerTransactions(id, effectiveTenantId, isSuperAdmin);
  }
}
