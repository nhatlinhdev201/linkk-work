import {
  INITIAL_TENANTS,
  INITIAL_BOOKINGS,
  INITIAL_TASKERS,
  INITIAL_PARTNER_APPLICATIONS,
  INITIAL_CRON_JOBS,
  MOCK_USERS,
} from './mock-data';
import {
  Tenant,
  User,
  Booking,
  Tasker,
  PartnerApplication,
  CronJobItem,
} from '../types';

const STORAGE_KEYS = {
  TENANTS: 'linkkwork_admin_tenants',
  BOOKINGS: 'linkkwork_admin_bookings',
  TASKERS: 'linkkwork_admin_taskers',
  APPLICATIONS: 'linkkwork_admin_applications',
  CRON_JOBS: 'linkkwork_admin_cron_jobs',
  CURRENT_USER: 'linkkwork_admin_current_user',
  IMPERSONATED_TENANT_ID: 'linkkwork_admin_impersonated_tenant_id',
};

// Helper: load from localStorage with fallback
function loadData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Helper: save to localStorage
function saveData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save to localStorage for key ${key}`, e);
  }
}

// Simulate realistic network latency
const sleep = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

export class ApiClient {
  private static instance: ApiClient;

  private constructor() {
    if (!localStorage.getItem(STORAGE_KEYS.TENANTS)) {
      saveData(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
      saveData(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TASKERS)) {
      saveData(STORAGE_KEYS.TASKERS, INITIAL_TASKERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) {
      saveData(STORAGE_KEYS.APPLICATIONS, INITIAL_PARTNER_APPLICATIONS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CRON_JOBS)) {
      saveData(STORAGE_KEYS.CRON_JOBS, INITIAL_CRON_JOBS);
    }
  }

  public static get(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  // --- AUTHENTICATION & SESSIONS ---
  async login(email: string): Promise<User> {
    await sleep(250);
    const user = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
    }
    saveData(STORAGE_KEYS.CURRENT_USER, user);
    localStorage.removeItem(STORAGE_KEYS.IMPERSONATED_TENANT_ID);
    return user;
  }

  async getCurrentUser(): Promise<User | null> {
    return loadData<User | null>(STORAGE_KEYS.CURRENT_USER, MOCK_USERS[0]); // Default Super Admin for easy preview
  }

  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.IMPERSONATED_TENANT_ID);
  }

  // --- TENANTS & IMPERSONATION ---
  async getTenants(): Promise<Tenant[]> {
    await sleep(150);
    return loadData<Tenant[]>(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
  }

  async getTenantById(id: string): Promise<Tenant | undefined> {
    const tenants = await this.getTenants();
    return tenants.find((t) => t.id === id);
  }

  async setImpersonation(tenantId: string | null): Promise<void> {
    await sleep(100);
    if (tenantId) {
      localStorage.setItem(STORAGE_KEYS.IMPERSONATED_TENANT_ID, tenantId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.IMPERSONATED_TENANT_ID);
    }
  }

  getImpersonatedTenantId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.IMPERSONATED_TENANT_ID);
  }

  // --- PARTNER ONBOARDING APPLICATIONS ---
  async getPartnerApplications(): Promise<PartnerApplication[]> {
    await sleep(150);
    return loadData<PartnerApplication[]>(
      STORAGE_KEYS.APPLICATIONS,
      INITIAL_PARTNER_APPLICATIONS
    );
  }

  async submitPartnerApplication(
    data: Omit<PartnerApplication, 'id' | 'status' | 'createdAt'>
  ): Promise<PartnerApplication> {
    await sleep(300);
    const apps = await this.getPartnerApplications();
    const newApp: PartnerApplication = {
      ...data,
      id: `app-${Date.now()}`,
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
    };
    apps.unshift(newApp);
    saveData(STORAGE_KEYS.APPLICATIONS, apps);
    return newApp;
  }

  async approvePartnerApplication(applicationId: string): Promise<Tenant> {
    await sleep(300);
    const apps = await this.getPartnerApplications();
    const app = apps.find((a) => a.id === applicationId);
    if (!app) throw new Error('Không tìm thấy đơn đăng ký');

    app.status = 'APPROVED';
    saveData(STORAGE_KEYS.APPLICATIONS, apps);

    // Create Tenant
    const tenants = await this.getTenants();
    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      code: app.businessName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .slice(0, 10),
      name: app.businessName,
      taxId: app.taxId,
      phone: app.contactPhone,
      email: app.contactEmail,
      city: app.city,
      status: 'ACTIVE',
      plan: 'BASIC',
      commissionRate: 15,
      isDefault: false,
      taskerCount: 0,
      activeOrderCount: 0,
      createdAt: new Date().toISOString(),
    };
    tenants.push(newTenant);
    saveData(STORAGE_KEYS.TENANTS, tenants);
    return newTenant;
  }

  async rejectPartnerApplication(applicationId: string, reason: string): Promise<void> {
    await sleep(250);
    const apps = await this.getPartnerApplications();
    const app = apps.find((a) => a.id === applicationId);
    if (!app) throw new Error('Không tìm thấy đơn đăng ký');

    app.status = 'REJECTED';
    app.rejectionReason = reason;
    saveData(STORAGE_KEYS.APPLICATIONS, apps);
  }

  // --- BOOKINGS (SCOPED BY TENANT) ---
  async getBookings(tenantId?: string | null): Promise<Booking[]> {
    await sleep(200);
    const bookings = loadData<Booking[]>(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    if (!tenantId) return bookings;
    return bookings.filter(
      (b) => b.servicingTenantId === tenantId || b.originTenantId === tenantId
    );
  }

  async createManualBooking(
    tenantId: string,
    tenantName: string,
    data: {
      customerName: string;
      customerPhone: string;
      addressText: string;
      serviceName: string;
      pricingType: 'HOURLY' | 'PER_UNIT' | 'BIDDING';
      scheduledAt: string;
      durationHours?: number;
      totalAmount: number;
    }
  ): Promise<Booking> {
    await sleep(250);
    const bookings = loadData<Booking[]>(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      code: `BK-2026-${Math.floor(100 + Math.random() * 900)}`,
      originTenantId: tenantId,
      servicingTenantId: tenantId,
      servicingTenantName: tenantName,
      ...data,
      serviceId: 'srv-manual',
      status: 'PENDING_DISPATCH',
      assignedTaskerId: null,
      assignedTaskerName: null,
      assignedTaskerPhone: null,
      createdAt: new Date().toISOString(),
    };
    bookings.unshift(newBooking);
    saveData(STORAGE_KEYS.BOOKINGS, bookings);
    return newBooking;
  }

  async directAssignBooking(
    bookingId: string,
    taskerId: string,
    adminTenantId: string
  ): Promise<Booking> {
    await sleep(200);
    const bookings = loadData<Booking[]>(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    const taskers = await this.getTaskers(adminTenantId);

    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('Không tìm thấy đơn hàng');

    const tasker = taskers.find((t) => t.id === taskerId);
    if (!tasker) {
      throw new Error('Tasker không thuộc thẩm quyền của Tenant này.');
    }

    booking.assignedTaskerId = tasker.id;
    booking.assignedTaskerName = tasker.name;
    booking.assignedTaskerPhone = tasker.phone;
    booking.status = 'ASSIGNED';

    saveData(STORAGE_KEYS.BOOKINGS, bookings);
    return booking;
  }

  async broadcastInternalBooking(bookingId: string): Promise<Booking> {
    await sleep(150);
    const bookings = loadData<Booking[]>(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('Không tìm thấy đơn hàng');

    booking.status = 'BROADCASTING';
    saveData(STORAGE_KEYS.BOOKINGS, bookings);
    return booking;
  }

  // --- TASKERS (SCOPED BY TENANT) ---
  async getTaskers(tenantId?: string | null): Promise<Tasker[]> {
    await sleep(150);
    const taskers = loadData<Tasker[]>(STORAGE_KEYS.TASKERS, INITIAL_TASKERS);
    if (!tenantId) return taskers;
    return taskers.filter((t) => t.tenantId === tenantId);
  }

  // --- CRON & WORKER CONTROL CENTER ---
  async getCronJobs(): Promise<CronJobItem[]> {
    await sleep(150);
    return loadData<CronJobItem[]>(STORAGE_KEYS.CRON_JOBS, INITIAL_CRON_JOBS);
  }

  async toggleCronJob(jobName: string, enabled: boolean): Promise<CronJobItem> {
    await sleep(200);
    const jobs = await this.getCronJobs();
    const job = jobs.find((j) => j.jobName === jobName);
    if (!job) throw new Error(`Không tìm thấy tiến trình ${jobName}`);

    job.isEnabled = enabled;
    job.lastStatus = enabled ? 'IDLE' : 'PAUSED';
    saveData(STORAGE_KEYS.CRON_JOBS, jobs);
    return job;
  }

  async triggerCronJobNow(jobName: string): Promise<{ success: boolean; message: string }> {
    await sleep(500); // Simulate background run
    const jobs = await this.getCronJobs();
    const job = jobs.find((j) => j.jobName === jobName);
    if (!job) throw new Error(`Không tìm thấy tiến trình ${jobName}`);

    job.lastRunAt = new Date().toISOString();
    job.lastStatus = 'SUCCESS';
    job.successCount += 1;
    saveData(STORAGE_KEYS.CRON_JOBS, jobs);

    return {
      success: true,
      message: `Đã kích hoạt thành công tiến trình ngầm ${jobName}. Kết quả: 0 lỗi.`,
    };
  }

  async updateCronJobParams(jobName: string, params: Record<string, any>): Promise<CronJobItem> {
    await sleep(200);
    const jobs = await this.getCronJobs();
    const job = jobs.find((j) => j.jobName === jobName);
    if (!job) throw new Error(`Không tìm thấy tiến trình ${jobName}`);

    job.params = { ...job.params, ...params };
    saveData(STORAGE_KEYS.CRON_JOBS, jobs);
    return job;
  }
}

export const api = ApiClient.get();
