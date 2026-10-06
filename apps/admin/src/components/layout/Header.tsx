import React from 'react';
import { UserCheck, LogOut, ExternalLink, Menu } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useConfirm } from '../feedback/ConfirmContext';
import { Link } from 'react-router-dom';

export interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { user, loginAs, logout, isSuperAdmin, isImpersonating, stopImpersonation, activeTenantName } = useAuth();
  const confirm = useConfirm();

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

  const handleStopImpersonation = async () => {
    const confirmed = await confirm({
      title: 'Thoát chế độ đại diện đối tác?',
      message: (
        <span>
          Bạn sẽ thoát khỏi vai trò đại diện cho <strong>&quot;{activeTenantName}&quot;</strong> và quay trở lại quyền hạn đầy đủ
          của Super Admin trên toàn sàn LinkkWork.
        </span>
      ),
      variant: 'info',
      confirmText: 'Thoát đại diện',
      cancelText: 'Ở lại',
    });
    if (!confirmed) return;
    await stopImpersonation();
  };

  return (
    <header className="h-16 shrink-0 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-3 z-30 shadow-xs">
      {/* Left section: Mobile menu hamburger button & Partner Register Link */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link
          to="/partner/register"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Form Đăng Ký Đối Tác (Public)</span>
          <span className="sm:hidden">Đăng ký ĐT</span>
        </Link>
      </div>

      {/* Right controls: Demo Account Switcher & User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Quick Demo Role Switcher (Ẩn trên màn hình rất nhỏ < 768px để không tràn) */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Thử vai trò:</span>
          </span>
          <button
            onClick={() => loginAs('superadmin@linkkwork.vn')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              user?.email === 'superadmin@linkkwork.vn'
                ? 'bg-brand-500 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Super Admin
          </button>
          <button
            onClick={() => loginAs('admin@anhduong.vn')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              user?.email === 'admin@anhduong.vn'
                ? 'bg-brand-500 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Tenant Ánh Dương
          </button>
          <button
            onClick={() => loginAs('admin@dienlanhsg.com')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              user?.email === 'admin@dienlanhsg.com'
                ? 'bg-brand-500 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Tenant Điện Lạnh SG
          </button>
        </div>

        {/* Impersonation shortcut */}
        {isImpersonating && (
          <button
            onClick={handleStopImpersonation}
            className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-2.5 py-1.5 rounded-lg border border-amber-300 transition flex items-center gap-1 shrink-0"
          >
            Thoát đại diện
          </button>
        )}

        {/* User profile dropdown & logout */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900 truncate max-w-[140px]">{user?.name}</p>
            <p className="text-[11px] text-brand-600 font-medium font-mono">
              {isSuperAdmin ? 'Platform Owner' : 'Tenant Partner'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất tài khoản"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
