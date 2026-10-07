export type TaskerAvailabilityCode =
  | 'READY'
  | 'BUSY'
  | 'LOW_DEPOSIT'
  | 'UNVERIFIED_KYC'
  | 'OFFLINE'
  | 'RADAR_DISABLED'
  | 'RESTRICTED';

export interface TaskerAvailability {
  isReadyForDispatch: boolean;
  code: TaskerAvailabilityCode;
  label: string;
  reason: string;
}

export interface TaskerActiveJob {
  bookingId: string;
  bookingCode: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  addressText: string;
  status: string;
  scheduledAt: Date | string;
  totalAmount: number;
}

export function computeTaskerAvailability(
  userStatus: string | undefined,
  profile: {
    isOnline?: boolean;
    depositBalance?: number;
    kycVerified?: boolean;
    autoRadarEnabled?: boolean;
    currentStatus?: string;
  } | null | undefined,
  activeBooking?: {
    id: string;
    code: string;
    status: string;
  } | null,
): TaskerAvailability {
  if (!profile) {
    return {
      isReadyForDispatch: false,
      code: 'RESTRICTED',
      label: 'Chưa có hồ sơ',
      reason: 'Người dùng chưa được khởi tạo hồ sơ thợ (TaskerProfile)',
    };
  }

  // 1. Trạng thái tài khoản hoặc thợ bị hạn chế / khóa
  if (userStatus === 'RESTRICTED' || profile.currentStatus === 'RESTRICTED') {
    return {
      isReadyForDispatch: false,
      code: 'RESTRICTED',
      label: 'Bị giới hạn / Khóa',
      reason: 'Tài khoản hoặc trạng thái thợ đang bị giới hạn hoặc khóa tạm thời',
    };
  }

  // 2. Trạng thái ca trực (Ngoại tuyến)
  if (!profile.isOnline) {
    return {
      isReadyForDispatch: false,
      code: 'OFFLINE',
      label: 'Ngoại tuyến',
      reason: 'Thợ đang tắt ca trực tuyến, chưa sẵn sàng nhận đơn',
    };
  }

  // 3. Số dư ký quỹ tối thiểu (< 100k)
  if ((profile.depositBalance ?? 0) < 100000) {
    return {
      isReadyForDispatch: false,
      code: 'LOW_DEPOSIT',
      label: 'Nợ cọc (< 100k)',
      reason: `Số dư ký quỹ (${Math.round(profile.depositBalance ?? 0).toLocaleString('vi-VN')}đ) thấp hơn mức tối thiểu 100.000đ`,
    };
  }

  // 4. Xác thực danh tính KYC
  if (!profile.kycVerified) {
    return {
      isReadyForDispatch: false,
      code: 'UNVERIFIED_KYC',
      label: 'Chờ duyệt KYC',
      reason: 'Hồ sơ chưa được xác thực thông tin căn cước công dân (CCCD)',
    };
  }

  // 5. Đang trong ca làm việc (BUSY)
  if (activeBooking || (profile.currentStatus && profile.currentStatus !== 'IDLE')) {
    const jobCode = activeBooking?.code ? ` (${activeBooking.code})` : '';
    return {
      isReadyForDispatch: false,
      code: 'BUSY',
      label: 'Đang làm việc',
      reason: `Thợ đang trong ca thực hiện công việc${jobCode}`,
    };
  }

  // 6. Tắt radar tự động
  if (profile.autoRadarEnabled === false) {
    return {
      isReadyForDispatch: false,
      code: 'RADAR_DISABLED',
      label: 'Tắt radar tự động',
      reason: 'Thợ tắt tính năng tự động nhận việc qua radar (cần Admin chỉ định tay)',
    };
  }

  // 7. Sẵn sàng hoàn toàn
  return {
    isReadyForDispatch: true,
    code: 'READY',
    label: 'Sẵn sàng nhận việc',
    reason: 'Đủ điều kiện nhận việc và sẵn sàng quét đơn từ radar điều phối',
  };
}

export function formatActiveJob(
  booking: {
    id: string;
    code: string;
    status: string;
    customerName: string;
    customerPhone: string;
    addressText: string;
    scheduledAt: Date | string;
    totalAmount: number;
    service?: {
      name?: string;
    } | null;
  } | null | undefined,
): TaskerActiveJob | null {
  if (!booking) return null;
  return {
    bookingId: booking.id,
    bookingCode: booking.code,
    serviceName: booking.service?.name || 'Dịch vụ',
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    addressText: booking.addressText,
    status: booking.status,
    scheduledAt: booking.scheduledAt,
    totalAmount: booking.totalAmount,
  };
}
