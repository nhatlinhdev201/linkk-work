import React from 'react';
import { UserCheck, LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, loginAs, logout, isSuperAdmin, isImpersonating, stopImpersonation } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      {/* Left title / Quick action */}
      <div className="flex items-center gap-3">
        <Link
          to="/partner/register"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          <span>Form Đăng Ký Đối Tác (Public)</span>
        </Link>
      </div>

      {/* Right controls: Demo Account Switcher & User Profile */}
      <div className="flex items-center gap-4">
        {/* Quick Demo Role Switcher */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
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
            onClick={stopImpersonation}
            className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-2.5 py-1.5 rounded-lg border border-amber-300 transition flex items-center gap-1"
          >
            Thoát đại diện
          </button>
        )}

        {/* User profile dropdown & logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900">{user?.name}</p>
            <p className="text-[11px] text-brand-600 font-medium font-mono">
              {isSuperAdmin ? 'Platform Owner' : 'Tenant Partner'}
            </p>
          </div>
          <button
            onClick={logout}
            title="Đăng xuất"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
