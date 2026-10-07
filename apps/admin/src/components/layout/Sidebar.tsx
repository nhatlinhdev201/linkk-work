import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  LogOut,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useUIStore } from '../../stores/uiStore';
import { useConfirm } from '../feedback/ConfirmContext';

export interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onMobileClose }) => {
  const { user, isSuperAdmin, activeTenantName, isImpersonating, logout } = useAuth();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const confirm = useConfirm();
  const isCollapsed = isSidebarCollapsed;

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Xác nhận đăng xuất?',
      message: 'Bạn có chắc chắn muốn kết thúc phiên làm việc trên hệ thống quản trị LinkkWork?',
      variant: 'danger',
      confirmText: 'Đăng xuất',
      cancelText: 'Hủy bỏ',
    });
    if (!confirmed) return;
    await logout();
  };

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
    {
      to: '/system-docs',
      label: 'Tài liệu Hệ thống',
      icon: BookOpen,
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN'],
      badge: 'Docs',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay - Only rendered when mobile drawer is open */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300 animate-fade-in"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* SINGLE LAYER RESPONSIVE ASIDE (Zero duplicated DOM nodes) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:static md:z-20 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800 transition-all duration-300 ease-in-out shadow-2xl md:shadow-none h-full ${
          /* Desktop width */
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } ${
          /* Mobile slide transform */
          isMobileOpen
            ? 'translate-x-0 w-72 max-w-[85vw]'
            : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="transition-opacity duration-200 truncate">
                <span className="text-base font-extrabold text-white tracking-tight flex items-center gap-1">
                  Linkk<span className="text-brand-400">Work</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block">
                  Admin Portal
                </span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tenant Context Indicator */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="p-3 mx-3 my-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-xs shrink-0 transition-all duration-200">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-medium">Ngữ cảnh:</span>
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
            <div className="text-xs font-bold text-white truncate" title={activeTenantName}>
              {activeTenantName}
            </div>
          </div>
        )}

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems
            .filter((item) => user && item.roles.includes(user.role))
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onMobileClose}
                  title={isCollapsed && !isMobileOpen ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center ${
                      isCollapsed && !isMobileOpen ? 'justify-center px-2' : 'justify-between px-3.5'
                    } py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>
                  {(!isCollapsed || isMobileOpen) && item.badge && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
        </nav>

        {/* Bottom Profile & Desktop Collapse Toggle */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400 font-bold text-xs shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex-1 min-w-0 truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {isSuperAdmin ? 'Super Admin' : 'Tenant Admin'}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Desktop Collapse Toggle Button */}
            <button
              onClick={toggleSidebar}
              className="hidden md:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
              aria-label="Thu gọn/mở rộng sidebar"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
