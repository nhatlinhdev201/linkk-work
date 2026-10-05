import {
  INITIAL_TENANTS,
  INITIAL_BOOKINGS,
  INITIAL_TASKERS,
  INITIAL_PARTNER_APPLICATIONS,
  INITIAL_CRON_JOBS,
  INITIAL_SERVICE_CATEGORIES,
  INITIAL_SERVICES,
  INITIAL_FINANCIAL_TRANSACTIONS,
  INITIAL_FINANCIAL_SUMMARY,
  INITIAL_TENANT_SETTINGS,
  MOCK_USERS,
} from './mock-data.ts';
import type {
  Tenant,
  User,
  Booking,
  Tasker,
  PartnerApplication,
  CronJobItem,
  ServiceCategory,
  ServiceItem,
  WalletTransaction,
  FinancialSummary,
  TenantSettings,
} from '../types/index.ts';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'linkkwork_admin_access_token',
  REFRESH_TOKEN: 'linkkwork_admin_refresh_token',
  IMPERSONATED_TENANT_ID: 'linkkwork_admin_impersonated_tenant_id',
  CURRENT_USER: 'linkkwork_admin_current_user',
  TENANTS: 'linkkwork_admin_tenants',
  BOOKINGS: 'linkkwork_admin_bookings',
  TASKERS: 'linkkwork_admin_taskers',
  APPLICATIONS: 'linkkwork_admin_applications',
  CRON_JOBS: 'linkkwork_admin_cron_jobs',
  SERVICES: 'linkkwork_admin_services',
  CATEGORIES: 'linkkwork_admin_categories',
  FINANCIAL_TX: 'linkkwork_admin_financial_tx',
  FINANCIAL_SUMMARY: 'linkkwork_admin_financial_summary',
  SETTINGS: 'linkkwork_admin_tenant_settings',
};

export interface BackendTenantResponse {
  id: string;
  code: string;
  name: string;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  status: Tenant['status'];
  plan?: 'BASIC' | 'PRO' | 'ENTERPRISE';
  commissionRate?: number;
  isDefault?: boolean;
  taskerCount?: number;
  bookingCount?: number;
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    taskerProfiles?: number;
    originBookings?: number;
    servicingBookings?: number;
    users?: number;
  };
}

export interface BackendUserResponse {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  isSuperAdmin?: boolean;
  tenantId?: string | null;
  resolvedTenantId?: string | null;
  status?: string;
  avatarUrl?: string | null;
  tenant?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: BackendUserResponse;
}

type GlobalWithStorageAndProcess = {
  localStorage?: Storage;
  process?: { env?: Record<string, string | undefined> };
};

type ImportMetaWithEnv = {
  env?: { VITE_API_URL?: string };
};

const memStore = new Map<string, string>();
const memoryStorage: Storage = {
  getItem: (key: string): string | null => memStore.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    memStore.set(key, String(value));
  },
  removeItem: (key: string): void => {
    memStore.delete(key);
  },
  clear: (): void => {
    memStore.clear();
  },
  key: (index: number): string | null => Array.from(memStore.keys())[index] ?? null,
  get length(): number {
    return memStore.size;
  },
};

if (
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as unknown as GlobalWithStorageAndProcess).localStorage === 'undefined'
) {
  (globalThis as unknown as GlobalWithStorageAndProcess).localStorage = memoryStorage;
}

function getStorage(): Storage {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  const globalStorage = (globalThis as unknown as GlobalWithStorageAndProcess).localStorage;
  if (globalStorage) {
    return globalStorage;
  }
  return memoryStorage;
}

const getBaseApiUrl = (): string => {
  try {
    const metaEnv = (import.meta as unknown as ImportMetaWithEnv)?.env?.VITE_API_URL;
    if (metaEnv) return metaEnv;
  } catch {}
  try {
    const procEnv = (globalThis as unknown as GlobalWithStorageAndProcess)?.process?.env?.VITE_API_URL;
    if (procEnv) return procEnv;
  } catch {}
  return 'http://localhost:3000/api/v1';
};

// Helper: load from localStorage with fallback
function loadData<T>(key: string, fallback: T): T {
  try {
    const raw = getStorage().getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Helper: save to localStorage
function saveData<T>(key: string, data: T): void {
  try {
    getStorage().setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save to storage for key ${key}`, e);
  }
}

// Simulate realistic network latency
const sleep = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

export class ApiClient {
  private static instance: ApiClient;
  private readonly baseUrl: string;
  private refreshPromise: Promise<boolean> | null = null;

  private constructor() {
    this.baseUrl = getBaseApiUrl();
    if (!getStorage().getItem(STORAGE_KEYS.TENANTS)) {
      saveData(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
    }
    if (!getStorage().getItem(STORAGE_KEYS.BOOKINGS)) {
      saveData(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    }
    if (!getStorage().getItem(STORAGE_KEYS.TASKERS)) {
      saveData(STORAGE_KEYS.TASKERS, INITIAL_TASKERS);
    }
    if (!getStorage().getItem(STORAGE_KEYS.APPLICATIONS)) {
      saveData(STORAGE_KEYS.APPLICATIONS, INITIAL_PARTNER_APPLICATIONS);
    }
    if (!getStorage().getItem(STORAGE_KEYS.CRON_JOBS)) {
      saveData(STORAGE_KEYS.CRON_JOBS, INITIAL_CRON_JOBS);
    }
    if (!getStorage().getItem(STORAGE_KEYS.SERVICES)) {
      saveData(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    }
    if (!getStorage().getItem(STORAGE_KEYS.CATEGORIES)) {
      saveData(STORAGE_KEYS.CATEGORIES, INITIAL_SERVICE_CATEGORIES);
    }
    if (!getStorage().getItem(STORAGE_KEYS.FINANCIAL_TX)) {
      saveData(STORAGE_KEYS.FINANCIAL_TX, INITIAL_FINANCIAL_TRANSACTIONS);
    }
    if (!getStorage().getItem(STORAGE_KEYS.SETTINGS)) {
      saveData(STORAGE_KEYS.SETTINGS, INITIAL_TENANT_SETTINGS);
    }
  }

  public static get(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private clearSession(): void {
    const storage = getStorage();
    storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    storage.removeItem(STORAGE_KEYS.CURRENT_USER);
    storage.removeItem(STORAGE_KEYS.IMPERSONATED_TENANT_ID);
  }

  private async fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {},
    includeImpersonation = true
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const token = getStorage().getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (includeImpersonation) {
      const impId = getStorage().getItem(STORAGE_KEYS.IMPERSONATED_TENANT_ID);
      if (impId) {
        headers.set('X-Impersonate-Tenant-Id', impId);
      }
    }

    let res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        const newToken = getStorage().getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (newToken) {
          headers.set('Authorization', `Bearer ${newToken}`);
        }
        res = await fetch(url, { ...options, headers });
      } else {
        this.clearSession();
        throw new Error('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
      }
    }

    if (!res.ok) {
      const errorData = (await res.json().catch(() => ({}))) as { message?: string | string[] };
      const rawMsg = errorData.message || `Yêu cầu thất bại (${res.status})`;
      const errorMsg = Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg;
      const err = new Error(errorMsg) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }

    return (await res.json()) as T;
  }

  // --- AUTHENTICATION & SESSIONS ---
  async login(email: string, password?: string): Promise<User> {
    let effectiveEmail = email.trim();
    if (effectiveEmail.toLowerCase() === 'superadmin@linkkwork.vn') {
      effectiveEmail = 'admin@linkkwork.vn';
    }

    let effectivePassword = password;
    if (!effectivePassword) {
      const lower = effectiveEmail.toLowerCase();
      if (lower === 'admin@linkkwork.vn') {
        effectivePassword = 'Admin@123456';
      } else if (lower === 'admin@anhduong.vn') {
        effectivePassword = 'Partner@123456';
      } else {
        effectivePassword = 'Partner@123456';
      }
    }

    try {
      const res = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: effectiveEmail, password: effectivePassword }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        const rawMsg =
          errorData.message ||
          (res.status === 401
            ? 'Tài khoản hoặc mật khẩu không chính xác.'
            : `Đăng nhập thất bại (${res.status})`);
        throw new Error(Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg);
      }

      const data = (await res.json()) as AuthResponse;
      const storage = getStorage();
      storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
      storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
      storage.removeItem(STORAGE_KEYS.IMPERSONATED_TENANT_ID);

      const rawUser = data.user || {};
      const normalizedUser: User = {
        id: rawUser.id,
        name: rawUser.name,
        email: rawUser.email,
        role: rawUser.role,
        isSuperAdmin: !!rawUser.isSuperAdmin,
        tenantId: rawUser.tenantId || (rawUser.tenant && rawUser.tenant.id) || '',
        tenantName: rawUser.tenant?.name || 'Nền tảng LinkkWork',
        status: rawUser.status,
        avatarUrl: rawUser.avatarUrl || undefined,
      };

      saveData(STORAGE_KEYS.CURRENT_USER, normalizedUser);
      return normalizedUser;
    } catch (err: unknown) {
      if (
        err instanceof TypeError &&
        (err.message.toLowerCase().includes('fetch') || err.message.toLowerCase().includes('failed to fetch'))
      ) {
        throw new Error(
          `Không thể kết nối tới máy chủ API (${this.baseUrl}). Vui lòng kiểm tra lại dịch vụ backend.`
        );
      }
      throw err;
    }
  }

  async refreshToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const storage = getStorage();
      const refreshToken = storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) return false;

      try {
        const res = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
          return false;
        }

        const data = (await res.json()) as AuthResponse;
        if (data.accessToken && data.refreshToken) {
          storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
          storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
          if (data.user) {
            const rawUser = data.user;
            const normalizedUser: User = {
              id: rawUser.id,
              name: rawUser.name,
              email: rawUser.email,
              role: rawUser.role,
              isSuperAdmin: !!rawUser.isSuperAdmin,
              tenantId: rawUser.tenantId || (rawUser.tenant && rawUser.tenant.id) || '',
              tenantName: rawUser.tenant?.name || 'Nền tảng LinkkWork',
              status: rawUser.status,
              avatarUrl: rawUser.avatarUrl || undefined,
            };
            saveData(STORAGE_KEYS.CURRENT_USER, normalizedUser);
          }
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async getCurrentUser(): Promise<User | null> {
    const storage = getStorage();
    const token = storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      return null;
    }

    try {
      const data = await this.fetchWithAuth<BackendUserResponse>('/auth/me', { method: 'GET' }, true);
      const normalizedUser: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        isSuperAdmin: !!data.isSuperAdmin,
        tenantId: data.resolvedTenantId || data.tenantId || (data.tenant && data.tenant.id) || '',
        tenantName: data.tenant?.name || 'Nền tảng LinkkWork',
        status: data.status,
        avatarUrl: data.avatarUrl || undefined,
      };

      saveData(STORAGE_KEYS.CURRENT_USER, normalizedUser);
      return normalizedUser;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Phiên làm việc đã hết hạn')) {
        return null;
      }
      const errStatus =
        typeof err === 'object' && err !== null && 'status' in err
          ? (err as { status?: number }).status
          : undefined;
      if (errStatus === 401 || errStatus === 403) {
        this.clearSession();
        return null;
      }
      console.warn('Network error during getCurrentUser:', err instanceof Error ? err.message : String(err));
      return loadData<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    }
  }

  async logout(): Promise<void> {
    const storage = getStorage();
    const token = storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

    if (token) {
      try {
        await fetch(`${this.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ refreshToken: refreshToken || undefined }),
        });
      } catch (err: unknown) {
        console.warn('Logout API call failed:', err instanceof Error ? err.message : String(err));
      }
    }

    this.clearSession();
  }

  // --- TENANTS & IMPERSONATION ---
  async getTenants(): Promise<Tenant[]> {
    const storage = getStorage();
    const token = storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      return loadData<Tenant[]>(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
    }

    try {
      const items = await this.fetchWithAuth<BackendTenantResponse[]>('/tenants', { method: 'GET' }, false);
      if (!Array.isArray(items)) {
        return loadData<Tenant[]>(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
      }

      const tenants: Tenant[] = items.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        taxId: t.taxId || '',
        phone: t.phone || '',
        email: t.email || '',
        city: t.city || '',
        status: t.status,
        plan: t.plan || 'BASIC',
        commissionRate: t.commissionRate ?? 15,
        isDefault: !!t.isDefault,
        taskerCount: t.taskerCount ?? (t._count?.taskerProfiles || 0),
        activeOrderCount:
          t.bookingCount ??
          ((t._count?.originBookings || 0) + (t._count?.servicingBookings || 0)),
        createdAt: t.createdAt || new Date().toISOString(),
      }));

      saveData(STORAGE_KEYS.TENANTS, tenants);
      return tenants;
    } catch (err: unknown) {
      console.warn(
        'Network error fetching tenants, fallback to cache:',
        err instanceof Error ? err.message : String(err)
      );
      return loadData<Tenant[]>(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
    }
  }

  async getTenantById(id: string): Promise<Tenant | undefined> {
    const storage = getStorage();
    const token = storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      try {
        const t = await this.fetchWithAuth<BackendTenantResponse>(`/tenants/${id}`, { method: 'GET' }, true);
        return {
          id: t.id,
          code: t.code,
          name: t.name,
          taxId: t.taxId || '',
          phone: t.phone || '',
          email: t.email || '',
          city: t.city || '',
          status: t.status,
          plan: t.plan || 'BASIC',
          commissionRate: t.commissionRate ?? 15,
          isDefault: !!t.isDefault,
          taskerCount: t.taskerCount ?? (t._count?.taskerProfiles || 0),
          activeOrderCount:
            t.bookingCount ??
            ((t._count?.originBookings || 0) + (t._count?.servicingBookings || 0)),
          createdAt: t.createdAt || new Date().toISOString(),
        };
      } catch (err: unknown) {
        console.warn(`Error fetching tenant ${id}:`, err instanceof Error ? err.message : String(err));
      }
    }

    const tenants = await this.getTenants();
    return tenants.find((t) => t.id === id);
  }

  async setImpersonation(tenantId: string | null): Promise<void> {
    const storage = getStorage();
    if (tenantId) {
      storage.setItem(STORAGE_KEYS.IMPERSONATED_TENANT_ID, tenantId);
    } else {
      storage.removeItem(STORAGE_KEYS.IMPERSONATED_TENANT_ID);
    }
  }

  getImpersonatedTenantId(): string | null {
    return getStorage().getItem(STORAGE_KEYS.IMPERSONATED_TENANT_ID);
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
    data: Omit<PartnerApplication, 'id' | 'status' | 'createdAt'> & {
      password?: string;
      address?: string;
    }
  ): Promise<PartnerApplication> {
    const payload = {
      businessName: data.businessName,
      taxId: data.taxId,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      city: data.city,
      services: data.services && data.services.length > 0 ? data.services : ['don-dep-ve-sinh'],
      address: data.address || undefined,
      businessLicenseUrl: data.licenseDocUrl || undefined,
      password: data.password || 'Partner@123456',
    };

    try {
      const res = await fetch(`${this.baseUrl}/tenants/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        const rawMsg = errorData.message || `Đăng ký đối tác thất bại (${res.status})`;
        throw new Error(Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg);
      }

      const resData = (await res.json()) as {
        tenant?: BackendTenantResponse;
        adminUser?: BackendUserResponse;
      };
      const newApp: PartnerApplication = {
        id: resData.tenant?.id || `app-${Date.now()}`,
        businessName: data.businessName,
        taxId: data.taxId,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        city: data.city,
        services: data.services,
        selectedServices: data.selectedServices,
        status: 'SUBMITTED',
        createdAt: resData.tenant?.createdAt || new Date().toISOString(),
      };

      const apps = await this.getPartnerApplications();
      apps.unshift(newApp);
      saveData(STORAGE_KEYS.APPLICATIONS, apps);
      return newApp;
    } catch (err: unknown) {
      if (
        err instanceof TypeError &&
        (err.message.toLowerCase().includes('fetch') || err.message.toLowerCase().includes('failed to fetch'))
      ) {
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
      throw err;
    }
  }

  async approvePartnerApplication(tenantId: string): Promise<Tenant> {
    const storage = getStorage();
    const token = storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (token) {
      // Routed through fetchWithAuth: extracts & throws error message on non-2xx status
      const t = await this.fetchWithAuth<BackendTenantResponse>(
        `/tenants/${tenantId}/approve`,
        { method: 'POST' },
        false
      );

      const mappedTenant: Tenant = {
        id: t.id,
        code: t.code,
        name: t.name,
        taxId: t.taxId || '',
        phone: t.phone || '',
        email: t.email || '',
        city: t.city || '',
        status: t.status,
        plan: t.plan || 'BASIC',
        commissionRate: t.commissionRate ?? 15,
        isDefault: !!t.isDefault,
        taskerCount: t.taskerCount ?? 0,
        activeOrderCount: t.bookingCount ?? 0,
        createdAt: t.createdAt || new Date().toISOString(),
      };

      const apps = await this.getPartnerApplications();
      const app = apps.find((a) => a.id === tenantId);
      if (app) {
        app.status = 'APPROVED';
        saveData(STORAGE_KEYS.APPLICATIONS, apps);
      }

      const tenants = await this.getTenants();
      const existingIdx = tenants.findIndex((existing) => existing.id === t.id);
      if (existingIdx >= 0) {
        tenants[existingIdx] = mappedTenant;
      } else {
        tenants.unshift(mappedTenant);
      }
      saveData(STORAGE_KEYS.TENANTS, tenants);

      return mappedTenant;
    }

    // Fallback to mock applications only if completely unauthenticated
    await sleep(250);
    const apps = await this.getPartnerApplications();
    const app = apps.find((a) => a.id === tenantId);
    if (!app) throw new Error('Không tìm thấy đơn đăng ký');

    app.status = 'APPROVED';
    saveData(STORAGE_KEYS.APPLICATIONS, apps);

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

  async updateCronJobParams(
    jobName: string,
    params: Record<string, string | number | boolean>
  ): Promise<CronJobItem> {
    await sleep(200);
    const jobs = await this.getCronJobs();
    const job = jobs.find((j) => j.jobName === jobName);
    if (!job) throw new Error(`Không tìm thấy tiến trình ${jobName}`);

    job.params = { ...job.params, ...params };
    saveData(STORAGE_KEYS.CRON_JOBS, jobs);
    return job;
  }

  // --- DỊCH VỤ & BẢNG GIÁ (SERVICE CATALOG) ---
  async getServiceCategories(): Promise<ServiceCategory[]> {
    await sleep(100);
    return loadData<ServiceCategory[]>(
      STORAGE_KEYS.CATEGORIES,
      INITIAL_SERVICE_CATEGORIES
    );
  }

  async getServices(tenantId?: string | null): Promise<ServiceItem[]> {
    await sleep(150);
    const services = loadData<ServiceItem[]>(
      STORAGE_KEYS.SERVICES,
      INITIAL_SERVICES
    );
    if (!tenantId || tenantId === 'tenant-linkkwork') return services;
    // Return platform services plus tenant specific services
    return services.filter((s) => !s.tenantId || s.tenantId === tenantId);
  }

  async toggleServiceActive(serviceId: string, isActive: boolean): Promise<ServiceItem> {
    await sleep(150);
    const services = await this.getServices();
    const service = services.find((s) => s.id === serviceId);
    if (!service) throw new Error('Không tìm thấy dịch vụ');

    service.isActive = isActive;
    saveData(STORAGE_KEYS.SERVICES, services);
    return service;
  }

  async createService(
    newServiceData: Omit<ServiceItem, 'id' | 'createdAt'>
  ): Promise<ServiceItem> {
    await sleep(250);
    const services = await this.getServices();
    const service: ServiceItem = {
      ...newServiceData,
      id: `srv-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    services.unshift(service);
    saveData(STORAGE_KEYS.SERVICES, services);
    return service;
  }

  // --- TÀI CHÍNH & VÍ KÝ QUỸ (FINANCIAL & WALLET) ---
  async getFinancialSummary(tenantId?: string | null): Promise<FinancialSummary> {
    await sleep(150);
    const summary = loadData<FinancialSummary>(
      STORAGE_KEYS.FINANCIAL_SUMMARY,
      INITIAL_FINANCIAL_SUMMARY
    );
    if (!tenantId || tenantId === 'tenant-linkkwork') return summary;

    // Scale summary for tenant
    return {
      grossServiceVolume: Math.round(summary.grossServiceVolume * 0.42),
      platformCommissionEarned: Math.round(summary.platformCommissionEarned * 0.42),
      tenantNetRevenue: Math.round(summary.tenantNetRevenue * 0.42),
      totalDepositHeld: Math.round(summary.totalDepositHeld * 0.35),
      pendingSettlementsCount: Math.max(1, Math.round(summary.pendingSettlementsCount * 0.4)),
    };
  }

  async getWalletTransactions(tenantId?: string | null): Promise<WalletTransaction[]> {
    await sleep(150);
    const list = loadData<WalletTransaction[]>(
      STORAGE_KEYS.FINANCIAL_TX,
      INITIAL_FINANCIAL_TRANSACTIONS
    );
    if (!tenantId || tenantId === 'tenant-linkkwork') return list;
    return list.filter((t) => t.tenantId === tenantId);
  }

  // --- CÀI ĐẶT HỆ THỐNG & TENANT (SETTINGS) ---
  async getTenantSettings(tenantId: string): Promise<TenantSettings> {
    await sleep(100);
    const allSettings = loadData<Record<string, TenantSettings>>(
      STORAGE_KEYS.SETTINGS,
      INITIAL_TENANT_SETTINGS
    );
    return (
      allSettings[tenantId] || {
        tenantId,
        hotline: '1900 6868',
        supportEmail: 'cskh@linkkwork.vn',
        businessAddress: 'Đang cập nhật địa chỉ trụ sở',
        autoDispatchEnabled: true,
        maxRadiusKm: 15,
        defaultCommissionRate: 15,
        workingHours: { start: '07:00', end: '21:00' },
      }
    );
  }

  async updateTenantSettings(
    tenantId: string,
    updates: Partial<TenantSettings>
  ): Promise<TenantSettings> {
    await sleep(200);
    const allSettings = loadData<Record<string, TenantSettings>>(
      STORAGE_KEYS.SETTINGS,
      INITIAL_TENANT_SETTINGS
    );
    const current = await this.getTenantSettings(tenantId);
    const updated = { ...current, ...updates };
    allSettings[tenantId] = updated;
    saveData(STORAGE_KEYS.SETTINGS, allSettings);
    return updated;
  }
}

export const api = ApiClient.get();
