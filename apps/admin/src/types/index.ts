export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
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
  | 'EMERGENCY_REDISPATCH';

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
  pricingType: 'HOURLY' | 'PER_UNIT' | 'BIDDING';
  scheduledAt: string;
  durationHours?: number;
  totalAmount: number;
  status: BookingStatus;
  assignedTaskerId: string | null;
  assignedTaskerName: string | null;
  assignedTaskerPhone: string | null;
  createdAt: string;
}

export interface Tasker {
  id: string;
  code: string;
  name: string;
  phone: string;
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
  currentStatus: 'IDLE' | 'ARRIVING' | 'IN_PROGRESS';
  kycVerified: boolean;
  skills: string[];
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

export interface CronJobItem {
  jobName: string;
  description: string;
  cronExpression: string;
  isEnabled: boolean;
  lastRunAt: string;
  lastStatus: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PAUSED';
  durationMs: number;
  successCount: number;
  failCount: number;
  params: Record<string, any>;
}
