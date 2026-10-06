import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AssignTaskerDto } from './dto/assign-tasker.dto';
import { TransitionStatusDto } from './dto/transition-status.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../auth/guards/tenant-context.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { UserRole } from '@linkkwork/shared-types';

interface RequestWithTenant extends Request {
  tenantId?: string | null;
  isImpersonating?: boolean;
}

function getEffectiveTenantId(user: AuthenticatedUser, req: RequestWithTenant): string | null {
  const isSuperAdmin = user?.isSuperAdmin === true || user?.role === UserRole.SUPER_ADMIN;
  return req.isImpersonating ? (req.tenantId || null) : (isSuperAdmin ? null : (user?.tenantId || null));
}

@ApiTags('Bookings & Dispatch Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('')
  @ApiOperation({ summary: 'Tạo đơn hàng mới (Admin Manual Booking hoặc API)' })
  async createBooking(
    @Req() req: RequestWithTenant,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ) {
    const effectiveTenantId = req.isImpersonating ? (req.tenantId || null) : (user?.tenantId || null);
    return this.bookingService.createBooking(effectiveTenantId, user?.id || null, dto);
  }

  @Get('')
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng có phân quyền và phân trang' })
  async getBookings(
    @Req() req: RequestWithTenant,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryBookingsDto,
  ) {
    const effectiveTenantId = getEffectiveTenantId(user, req);
    return this.bookingService.getBookings(effectiveTenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết đơn hàng kèm lịch sử sự kiện và addons' })
  async getBookingById(
    @Param('id') id: string,
    @Req() req: RequestWithTenant,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveTenantId = getEffectiveTenantId(user, req);
    return this.bookingService.getBookingById(id, effectiveTenantId);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Chỉ định thợ trực tiếp (Direct Assignment) cho đơn hàng' })
  async directAssignTasker(
    @Param('id') id: string,
    @Body() dto: AssignTaskerDto,
    @Req() req: RequestWithTenant,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveTenantId = getEffectiveTenantId(user, req);
    const triggeredBy = `${user?.email || 'Admin'} (${user?.id || 'admin'})`;
    return this.bookingService.directAssignTasker(
      id,
      dto,
      effectiveTenantId,
      triggeredBy,
    );
  }

  @Post(':id/broadcast')
  @ApiOperation({ summary: 'Bắn đơn lên sàn radar cho thợ nhận việc (Broadcasting)' })
  async broadcastBooking(
    @Param('id') id: string,
    @Req() req: RequestWithTenant,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveTenantId = getEffectiveTenantId(user, req);
    const triggeredBy = `${user?.email || 'Admin'} (${user?.id || 'admin'})`;
    return this.bookingService.broadcastBooking(
      id,
      effectiveTenantId,
      triggeredBy,
    );
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Chuyển trạng thái đơn hàng (tuân thủ State Machine)' })
  async transitionStatus(
    @Param('id') id: string,
    @Body() dto: TransitionStatusDto,
    @Req() req: RequestWithTenant,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveTenantId = getEffectiveTenantId(user, req);
    const triggeredBy = `${user?.email || 'Admin'} (${user?.id || 'admin'})`;
    return this.bookingService.transitionStatus(
      id,
      dto,
      effectiveTenantId,
      triggeredBy,
    );
  }
}
