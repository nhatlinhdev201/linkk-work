import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-rose-100">
        <ShieldAlert className="w-10 h-10" />
      </div>

      <span className="text-sm font-bold uppercase tracking-wider text-rose-600 mb-2">
        Mã lỗi: 403 Forbidden
      </span>

      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3 tracking-tight">
        Bạn không có quyền truy cập khu vực này
      </h1>

      <p className="text-slate-500 max-w-md mb-8 text-sm leading-relaxed">
        Tài khoản hiện tại của bạn không có đủ thẩm quyền RBAC (Role-Based Access Control) để xem hoặc sửa đổi tài nguyên này.
      </p>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Quay lại trang trước
        </Button>
        <Link to="/dashboard">
          <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
            Về Bảng điều khiển
          </Button>
        </Link>
      </div>
    </div>
  );
};
