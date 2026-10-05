import React from 'react';
import { AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

export const ImpersonationBar: React.FC = () => {
  const { isImpersonating, activeTenantName, stopImpersonation } = useAuth();

  if (!isImpersonating) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-medium border-b border-amber-500 shadow-sm sticky top-0 z-[100] transition-all">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <span className="flex h-2.5 w-2.5 relative flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
        </span>
        <AlertTriangle className="w-4 h-4 text-slate-900 flex-shrink-0" />
        <span className="truncate">
          <strong>CHẾ ĐỘ ĐẠI DIỆN:</strong> Đang xem dưới quyền Tenant: <u className="font-bold underline decoration-slate-900">{activeTenantName}</u>. Mọi đơn tạo và thao tác điều phối đều mang ID của Tenant này.
        </span>
      </div>
      <button
        onClick={stopImpersonation}
        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950 hover:bg-slate-800 text-white rounded-md text-xs font-bold transition-colors shadow flex-shrink-0 ml-3"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Thoát đại diện</span>
      </button>
    </div>
  );
};
