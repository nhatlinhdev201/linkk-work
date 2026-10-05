import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Tenant } from '../types';
import { api } from '../api/client';
import { useToast } from '../components/feedback/ToastContext';

export interface AuthContextType {
  user: User | null;
  activeTenantId: string;
  activeTenantName: string;
  currentTenantId: string;
  currentTenantName: string;
  isImpersonating: boolean;
  impersonatedTenant: Tenant | null;
  impersonatedTenantId: string | null;
  isLoading: boolean;
  loginAs: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  startImpersonation: (tenant: Tenant) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  setImpersonatedTenant: (tenantId: string | null) => Promise<void>;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [impersonatedTenant, setImpersonatedTenantState] = useState<Tenant | null>(null);
  const { success, info } = useToast();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const u = await api.getCurrentUser();
        setUser(u);

        const impId = api.getImpersonatedTenantId();
        if (impId && u?.role === 'SUPER_ADMIN') {
          const t = await api.getTenantById(impId);
          if (t) setImpersonatedTenantState(t);
        }
      } catch (err) {
        console.error('Failed to init auth', err);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const loginAs = async (email: string) => {
    setIsLoading(true);
    try {
      const u = await api.login(email);
      setUser(u);
      setImpersonatedTenantState(null);
      success(
        'Đăng nhập thành công',
        `Chào mừng ${u.name} (${u.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Tenant Admin'})`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setImpersonatedTenantState(null);
    info('Đã đăng xuất', 'Hẹn gặp lại bạn.');
  };

  const startImpersonation = async (tenant: Tenant) => {
    if (user?.role !== 'SUPER_ADMIN') return;
    await api.setImpersonation(tenant.id);
    setImpersonatedTenantState(tenant);
    success(
      'Kích hoạt Chế độ Đại diện',
      `Đang xem dưới danh nghĩa: ${tenant.name}. Mọi quyền hạn trong Tenant đã được mở.`
    );
  };

  const stopImpersonation = async () => {
    await api.setImpersonation(null);
    setImpersonatedTenantState(null);
    info('Đã thoát Chế độ Đại diện', 'Bạn đã quay trở lại Tenant LinkkWork mặc định.');
  };

  const setImpersonatedTenant = async (tenantId: string | null) => {
    if (!tenantId) {
      await stopImpersonation();
      return;
    }
    const target = await api.getTenantById(tenantId);
    if (target) {
      await startImpersonation(target);
    }
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Determine active tenant scope
  const activeTenantId = impersonatedTenant
    ? impersonatedTenant.id
    : user?.tenantId || 'tenant-linkkwork';
  const activeTenantName = impersonatedTenant
    ? impersonatedTenant.name
    : user?.tenantName || 'Nền tảng LinkkWork';
  const isImpersonating = !!impersonatedTenant && isSuperAdmin;
  const impersonatedTenantId = impersonatedTenant ? impersonatedTenant.id : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        activeTenantId,
        activeTenantName,
        currentTenantId: activeTenantId,
        currentTenantName: activeTenantName,
        isImpersonating,
        impersonatedTenant,
        impersonatedTenantId,
        isLoading,
        loginAs,
        logout,
        startImpersonation,
        stopImpersonation,
        setImpersonatedTenant,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
