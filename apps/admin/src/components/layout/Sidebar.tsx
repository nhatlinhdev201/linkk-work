import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  Radio,
  Users,
  Cpu,
  Shield,
  Layers,
  Sparkles,
  Wallet,
  Settings,
  X,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

export interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onMobileClose }) => {
  const { user, isSuperAdmin, activeTenantName, isImpersonating } = useAuth();

  const navItems = [
    {
      to: '/dashboard',
      label: 'Tổng quan',
      icon: LayoutDashboard,
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN'],
    },
    {
      to: '/tenants',
      label: 'Quản lý Đối tác',
      icon: Building2,
      roles: ['SUPER_ADMIN'],
      badge: 'Admin',
    },
    {
      to: '/bookings',
      label: 'Quản lý Đơn hàng',
      icon: CalendarCheck,
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN'],
    },
    {
      to: '/dispatch',
      label: 'Bàn Điều phối',
      icon: Radio,
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN'],
    },
    {
      to: '/taskers',
      label: 'Đội ngũ Tasker',
      icon: Users,
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN'],
    },
    {
      to: '/services',
      label: 'Dịch vụ & Bảng giá',
      icon: Sparkles,
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN'],
    },
    {
      to: '/finance',
      label: 'Tài chính & Ví Sàn',
      icon: Wallet,
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN'],
    },
    {
      to: '/cron-jobs',
      label: 'Tiến trình Cron',
      icon: Cpu,
      roles: ['SUPER_ADMIN'],
      badge: 'Engine',
    },
    {
      to: '/settings',
      label: 'Cài đặt Hệ thống',
      icon: Settings,
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN'],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 select-none">
      {/* Brand Logo Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
              Linkk<span className="text-brand-400">Work</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block">
              Admin Portal
            </span>
          </div>
        </div>

        {/* Mobile close button */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tenant Context Indicator */}
      <div className="p-3.5 mx-3 my-3 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-xs">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-400 font-medium">Ngữ cảnh Tenant:</span>
          {isImpersonating ? (
            <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
              Đại diện
            </span>
          ) : (
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
              Chính thức
            </span>
          )}
        </div>
        <div className="text-sm font-bold text-white truncate" title={activeTenantName}>
          {activeTenantName}
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => user && item.roles.includes(user.role))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
      </nav>

      {/* User Role Card at Bottom */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400 font-bold text-xs shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {isSuperAdmin ? 'Super Administrator' : 'Tenant Administrator'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-64 flex-col flex-shrink-0 border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* 2. Mobile Drawer Sidebar with Backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />
          {/* Sliding panel */}
          <div className="relative w-72 max-w-[85vw] flex-1 z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
