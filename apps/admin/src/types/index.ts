export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  isSuperAdmin?: boolean;
  status?: string;
  avatarUrl?: string;
}

export type TenantStatus = 'ACTIVE' | 'PAST_DUE' | 'RESTRICTED' | 'SUSPENDED';

export interface Tenant {
  id: string;
  code: string;
  name: string;
  taxId: string;
  phone: string;
  email: string;
  city: string;
  status: TenantStatus;
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE';
  commissionRate: number; // e.g. 15%
  isDefault: boolean; // true for LinkkWork default tenant
  taskerCount: number;
  activeOrderCount: number;
  createdAt: string;
}

export type BookingStatus =
  | 'DRAFT'
  | 'PENDING_DISPATCH'
  | 'OFFERED_TO_FAVORITE'
  | 'BROADCASTING'
  | 'MATCHING'
  | 'ASSIGNED'
  | 'ARRIVING'
  | 'ON_THE_WAY'
  | 'IN_PROGRESS'
  | 'PENDING_ACCEPTANCE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EMERGENCY_REDISPATCH'
  | 'REVIEWED'
  | 'DISPATCH_FAILED';

export type PricingModel = 'HOURLY' | 'PER_UNIT' | 'BIDDING';

export interface BookingEventItem {
  id: string;
  fromStatus?: BookingStatus | null;
  toStatus: BookingStatus;
  triggeredBy: string;
  note?: string | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  code: string;
  originTenantId: string;
  servicingTenantId: string;
  servicingTenantName: string;
  customerName: string;
  customerPhone: string;
  addressText: string;
  serviceId: string;
  serviceName: string;
  pricingType: PricingModel;
  scheduledAt: string;
  durationHours?: number;
  totalAmount: number;
  status: BookingStatus;
  assignedTaskerId: string | null;
  assignedTaskerName: string | null;
  assignedTaskerPhone: string | null;
  events?: BookingEventItem[];
  createdAt: string;
}

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
  scheduledAt: string;
  totalAmount: number;
}

export interface Tasker {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  tenantId: string;
  tenantName: string;
  rating: number;
  ratingScore: number;
  completedJobs: number;
  isOnline: boolean;
  walletBalance: number;
  depositBalance: number;
  softHoldBalance: number;
  currentStatus: 'IDLE' | 'ASSIGNED' | 'ARRIVING' | 'IN_PROGRESS' | 'PENDING_ACCEPTANCE' | 'RESTRICTED';
  kycVerified: boolean;
  idCardNumber?: string;
  skills: string[];
  maxDistanceKm?: number;
  autoRadarEnabled?: boolean;
  salaryType?: 'COMMISSION' | 'FIXED_SALARY';
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  createdAt?: string;
  availability?: TaskerAvailability;
  activeJob?: TaskerActiveJob | null;
}

export interface PartnerApplication {
  id: string;
  businessName: string;
  taxId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  city: string;
  services: string[];
  selectedServices?: string[];
  licenseDocUrl?: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: string;
}

export type CronExecutionStatus = 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PAUSED';

export interface CronJobItem {
  jobName: string;
  description: string;
  cronExpression: string;
  isEnabled: boolean;
  lastRunAt: string;
  lastStatus: CronExecutionStatus;
  durationMs: number;
  successCount: number;
  failCount: number;
  params: Record<string, string | number | boolean>;
}

// --- DỊCH VỤ & BẢNG GIÁ (SERVICE CATALOG) ---
export interface ServiceAddon {
  id: string;
  name: string;
  price: number;
  description?: string;
  isActive?: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  displayOrder: number;
  defaultPricingType?: PricingModel;
  defaultBasePrice?: number;
  defaultUnitLabel?: string;
  isActive?: boolean;
}

export interface ServiceItem {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  slug: string;
  description: string;
  pricingModel: PricingModel;
  basePrice: number; // Giá cơ bản hoặc giá theo giờ
  unitLabel?: string; // e.g. "giờ", "máy", "bộ"
  durationHours?: number;
  minHours?: number;
  isActive: boolean;
  tenantId?: string; // null nếu là dịch vụ chung toàn sàn
  addons: ServiceAddon[];
  createdAt: string;
}

// --- TÀI CHÍNH & VÍ KÝ QUỸ (FINANCIAL & LEDGER) ---
export type TransactionType =
  | 'TOP_UP_DEPOSIT' // Nạp tiền ví ký quỹ
  | 'WITHDRAW_DEPOSIT' // Khấu trừ/rút ký quỹ
  | 'SOFT_HOLD' // Tạm khóa cọc khi nhận việc
  | 'HOLD_RELEASE' // Trả cọc sau khi hoàn tất
  | 'COMMISSION_FEE' // Thu phí hoa hồng sàn (15%)
  | 'SUBSCRIPTION_FEE' // Phí gói tháng Tenant
  | 'ORDER_PAYOUT' // Quyết toán tiền về ví thu nhập
  | 'PENALTY_DEDUCTION'; // Phạt vi phạm

export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'FAILED' | 'REJECTED';

export interface WalletTransaction {
  id: string;
  code: string;
  tenantId: string;
  tenantName?: string;
  taskerId?: string;
  taskerName?: string;
  bookingId?: string;
  bookingCode?: string;
  type: TransactionType;
  amount: number;
  direction: 'IN' | 'OUT';
  balanceBefore: number;
  balanceAfter: number;
  status: TransactionStatus;
  bankName?: string;
  bankAccount?: string;
  notes?: string;
  triggeredBy?: string;
  createdAt: string;
}

export interface FinancialSummary {
  grossServiceVolume: number; // Tổng giá trị đơn hàng phát sinh
  platformCommissionEarned: number; // Doanh thu hoa hồng sàn thực thu
  tenantNetRevenue: number; // Doanh thu thực nhận của Tenant
  totalDepositHeld: number; // Tổng số dư ký quỹ an toàn đang giữ
  pendingSettlementsCount: number; // Số đơn đang chờ nghiệm thu
}

// --- CÀI ĐẶT TENANT & SÀN (SETTINGS) ---
export interface TenantSettings {
  tenantId: string;
  hotline: string;
  supportEmail: string;
  businessAddress: string;
  autoDispatchEnabled: boolean;
  maxRadiusKm: number;
  defaultCommissionRate: number;
  workingHours: {
    start: string;
    end: string;
  };
}
