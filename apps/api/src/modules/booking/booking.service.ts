import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { PricingEngine } from '../catalog/pricing.engine';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AssignTaskerDto } from './dto/assign-tasker.dto';
import { TransitionStatusDto } from './dto/transition-status.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { isValidBookingTransition } from './booking-state-machine';
import { BookingStatus, UserRole, ServicePricingType, PaymentStatus } from '@linkkwork/shared-types';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly pricingEngine: PricingEngine,
  ) {}

  /**
   * Tạo đơn hàng mới với Server-Side Authoritative Pricing và Snapshot giá
   */
  async createBooking(
    currentTenantId: string | null,
    userId: string | null,
    dto: CreateBookingDto,
  ) {
    // 1. Lấy thông tin Dịch vụ gốc
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      include: {
        category: true,
        addons: true,
      },
    });

    if (!service || !service.isActive) {
      throw new NotFoundException(`Dịch vụ ${dto.serviceId} không tồn tại hoặc đã ngừng hoạt động`);
    }

    // 2. Lấy thông tin addons được chọn
    const selectedAddons = dto.addonIds && dto.addonIds.length > 0
      ? service.addons.filter((a) => dto.addonIds?.includes(a.id) && a.isActive)
      : [];

    const addonsPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);

    // 3. Tính toán giá thẩm quyền phía máy chủ (Server-Side Authoritative Pricing)
    const pricingResult = this.pricingEngine.calculate({
      pricingType: service.pricingType as unknown as ServicePricingType,
      baseUnitPrice: service.baseUnitPrice,
      durationHours: dto.durationHours,
      unitCount: dto.unitCount,
      areaSurcharge: dto.areaSurcharge ?? 0,
      addonsPrice,
      surgeMultiplier: dto.surgeMultiplier ?? 1.0,
      discountAmount: dto.discountAmount ?? 0,
    });

    // 4. Xác định Tenant nguồn & Tenant thụ hưởng
    let resolvedTenantId = currentTenantId;
    if (!resolvedTenantId) {
      const defaultTenant = await this.prisma.tenant.findFirst({
        where: { isDefault: true },
      });
      if (!defaultTenant) {
        throw new BadRequestException('Chưa cấu hình Tenant nền tảng mặc định');
      }
      resolvedTenantId = defaultTenant.id;
    }

    // 5. Sinh mã đơn hàng duy nhất: BK-YYYY-XXXXXX
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const code = `BK-${year}-${randomSuffix}`;

    // 6. Lưu bản ghi Booking cùng chi tiết Addons & Sự kiện ban đầu trong 1 Transaction
    const scheduledAtDate = new Date(dto.scheduledAt);
    if (isNaN(scheduledAtDate.getTime())) {
      throw new BadRequestException('Thời gian scheduledAt không hợp lệ');
    }

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          code,
          originTenantId: resolvedTenantId!,
          servicingTenantId: resolvedTenantId!,
          customerId: userId || null,
          serviceId: service.id,
          status: BookingStatus.PENDING_DISPATCH,
          pricingType: service.pricingType,
          baseUnitPrice: service.baseUnitPrice,
          durationHours: dto.durationHours || (service.pricingType === 'HOURLY' ? 2 : null),
          unitCount: dto.unitCount || (service.pricingType === 'PER_UNIT' ? 1 : null),
          areaSurcharge: dto.areaSurcharge || 0,
          addonsPrice,
          surgeMultiplier: pricingResult.surgeMultiplier,
          surgeAmount: pricingResult.surgeAmount,
          discountAmount: pricingResult.discountAmount,
          voucherCode: dto.voucherCode || null,
          totalAmount: pricingResult.finalTotal,
          scheduledAt: scheduledAtDate,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          addressText: dto.addressText,
          latitude: dto.latitude || null,
          longitude: dto.longitude || null,
          addons: {
            create: selectedAddons.map((a) => ({
              addonId: a.id,
              name: a.name,
              price: a.price,
            })),
          },
          events: {
            create: {
              fromStatus: null,
              toStatus: BookingStatus.PENDING_DISPATCH,
              triggeredBy: userId || 'ADMIN',
              note: dto.note || 'Tạo đơn hàng mới',
            },
          },
        },
        include: {
          service: true,
          addons: true,
          events: true,
          originTenant: true,
          servicingTenant: true,
        },
      });

      return booking;
    });
  }

  /**
   * Danh sách đơn hàng có phân quyền cách ly Tenant
   */
  async getBookings(
    effectiveTenantId: string | null,
    query: QueryBookingsDto,
  ) {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(Math.max(query.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    // Filter điều kiện Tenant
    const where: Record<string, unknown> = {};

    if (effectiveTenantId) {
      where.OR = [
        { servicingTenantId: effectiveTenantId },
        { originTenantId: effectiveTenantId },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const searchTerm = query.search.trim();
      where.AND = [
        {
          OR: [
            { code: { contains: searchTerm, mode: 'insensitive' } },
            { customerName: { contains: searchTerm, mode: 'insensitive' } },
            { customerPhone: { contains: searchTerm } },
            { addressText: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          service: true,
          addons: true,
          events: {
            orderBy: { createdAt: 'asc' },
          },
          originTenant: true,
          servicingTenant: true,
          assignedTasker: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Chi tiết đơn hàng với xác thực Tenant
   */
  async getBookingById(
    id: string,
    effectiveTenantId: string | null,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        service: {
          include: { category: true },
        },
        addons: true,
        events: {
          orderBy: { createdAt: 'asc' },
        },
        originTenant: true,
        servicingTenant: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        assignedTasker: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            taskerProfile: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID ${id}`);
    }

    // Kiểm tra cô lập dữ liệu
    if (effectiveTenantId) {
      const belongsToTenant =
        booking.servicingTenantId === effectiveTenantId ||
        booking.originTenantId === effectiveTenantId;

      if (!belongsToTenant) {
        throw new ForbiddenException('Bạn không có quyền truy cập đơn hàng của Tenant khác');
      }
    }

    return booking;
  }

  /**
   * Chỉ định thợ trực tiếp (Direct Assignment) với kiểm tra phân quyền Tenant
   */
  async directAssignTasker(
    bookingId: string,
    dto: AssignTaskerDto,
    effectiveTenantId: string | null,
    triggeredBy: string,
    isSuperAdmin: boolean = false,
  ) {
    const booking = await this.getBookingById(bookingId, effectiveTenantId);

    // Kiểm tra trạng thái hợp lệ để gán thợ
    if (
      booking.status !== BookingStatus.PENDING_DISPATCH &&
      booking.status !== BookingStatus.BROADCASTING &&
      booking.status !== BookingStatus.EMERGENCY_REDISPATCH
    ) {
      throw new BadRequestException(
        `Không thể gán thợ khi đơn đang ở trạng thái ${booking.status}. Trạng thái phải là PENDING_DISPATCH hoặc BROADCASTING.`,
      );
    }

    // Kiểm tra thợ tồn tại và thẩm quyền Tenant
    const tasker = await this.prisma.user.findUnique({
      where: { id: dto.taskerId },
      include: { taskerProfile: true },
    });

    if (!tasker || tasker.role !== UserRole.TASKER) {
      throw new BadRequestException(`Người dùng ${dto.taskerId} không phải là Tasker hợp lệ`);
    }

    // Thợ bắt buộc phải thuộc Tenant điều phối của đơn hàng
    if (tasker.tenantId !== booking.servicingTenantId) {
      if (!isSuperAdmin) {
        throw new ForbiddenException('Thợ không thuộc thẩm quyền của Tenant quản lý đơn này');
      }
    }

    const previousStatus = booking.status;

    return this.prisma.$transaction(async (tx) => {
      const isCrossTenant =
        tasker.tenantId !== booking.servicingTenantId && isSuperAdmin && Boolean(tasker.tenantId);

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          ...(isCrossTenant && tasker.tenantId ? { servicingTenantId: tasker.tenantId } : {}),
          assignedTaskerId: tasker.id,
          status: BookingStatus.ASSIGNED,
          events: {
            create: {
              fromStatus: previousStatus,
              toStatus: BookingStatus.ASSIGNED,
              triggeredBy,
              note: dto.note || `Chỉ định trực tiếp thợ ${tasker.name} (${tasker.phone})`,
            },
          },
        },
        include: {
          service: true,
          addons: true,
          events: true,
          originTenant: true,
          servicingTenant: true,
          assignedTasker: {
            select: { id: true, name: true, phone: true },
          },
        },
      });

      // Nếu đơn đang mở trên Redis radar thì cập nhật
      await this.redis.set(`job:status:${bookingId}`, 'ASSIGNED', 86400);

      return updatedBooking;
    });
  }

  /**
   * Chuyển trạng thái đơn hàng tuân thủ Booking State Machine
   */
  async transitionStatus(
    bookingId: string,
    dto: TransitionStatusDto,
    effectiveTenantId: string | null,
    triggeredBy: string,
  ) {
    const booking = await this.getBookingById(bookingId, effectiveTenantId);

    if (!isValidBookingTransition(booking.status, dto.status)) {
      throw new BadRequestException(
        `Chuyển đổi trạng thái không hợp lệ: không thể chuyển từ ${booking.status} sang ${dto.status}`,
      );
    }

    const previousStatus = booking.status;

    return this.prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        status: dto.status,
        events: {
          create: {
            fromStatus: previousStatus,
            toStatus: dto.status,
            triggeredBy,
            note: dto.note || `Chuyển trạng thái sang ${dto.status}`,
          },
        },
      };

      if (dto.status === BookingStatus.COMPLETED) {
        updateData.paymentStatus = PaymentStatus.RELEASED_TO_TASKER;
      }

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: updateData,
        include: {
          service: true,
          addons: true,
          events: {
            orderBy: { createdAt: 'asc' },
          },
          originTenant: true,
          servicingTenant: true,
          assignedTasker: {
            select: { id: true, name: true, phone: true },
          },
        },
      });

      if (dto.status === BookingStatus.COMPLETED && booking.assignedTaskerId) {
        await tx.taskerProfile.updateMany({
          where: { userId: booking.assignedTaskerId },
          data: {
            completedJobsCount: { increment: 1 },
          },
        });
      }

      // Cập nhật trạng thái Redis cho radar/worker
      await this.redis.set(`job:status:${bookingId}`, dto.status, 86400);

      return updatedBooking;
    });
  }

  /**
   * Bắn đơn lên sàn radar diện rộng (BROADCASTING)
   */
  async broadcastBooking(
    bookingId: string,
    effectiveTenantId: string | null,
    triggeredBy: string,
  ) {
    const booking = await this.getBookingById(bookingId, effectiveTenantId);

    if (
      booking.status !== BookingStatus.PENDING_DISPATCH &&
      booking.status !== BookingStatus.EMERGENCY_REDISPATCH
    ) {
      throw new BadRequestException(
        `Chỉ đơn ở trạng thái PENDING_DISPATCH hoặc EMERGENCY_REDISPATCH mới được bắn đơn radar`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.BROADCASTING,
          events: {
            create: {
              fromStatus: booking.status,
              toStatus: BookingStatus.BROADCASTING,
              triggeredBy,
              note: 'Bắn đơn lên sàn radar cho thợ nhận việc',
            },
          },
        },
        include: {
          service: true,
          addons: true,
          events: true,
        },
      });

      // Mở trạng thái trên Redis cho thuật toán atomic fast-finger claim CAS
      await this.redis.set(`job:status:${bookingId}`, 'OPEN', 86400);

      return updated;
    });
  }

  /**
   * Danh sách thợ khả dụng của Tenant để phục vụ điều phối
   */
  async getAvailableTaskers(effectiveTenantId: string | null) {
    const where: Record<string, unknown> = {
      role: UserRole.TASKER,
    };

    if (effectiveTenantId) {
      where.tenantId = effectiveTenantId;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        avatarUrl: true,
        tenantId: true,
        taskerProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
