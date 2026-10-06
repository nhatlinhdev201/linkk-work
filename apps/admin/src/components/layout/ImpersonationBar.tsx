import React from 'react';
import { AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useConfirm } from '../feedback/ConfirmContext';

export const ImpersonationBar: React.FC = () => {
  const { isImpersonating, activeTenantName, stopImpersonation } = useAuth();
  const confirm = useConfirm();

  if (!isImpersonating) return null;

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
    <div className="w-full shrink-0 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-medium border-b border-amber-500 shadow-sm z-50 transition-all">
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
        onClick={handleStopImpersonation}
        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950 hover:bg-slate-800 text-white rounded-md text-xs font-bold transition-colors shadow flex-shrink-0 ml-3"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Thoát đại diện</span>
      </button>
    </div>
  );
};
