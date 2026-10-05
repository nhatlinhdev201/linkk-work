import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-brand-100">
        <Compass className="w-10 h-10 animate-spin-slow" />
      </div>

      <span className="text-sm font-bold uppercase tracking-wider text-brand-600 mb-2">
        Mã lỗi: 404 Not Found
      </span>

      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3 tracking-tight">
        Trang này không tồn tại hoặc đã bị di chuyển
      </h1>

      <p className="text-slate-500 max-w-md mb-8 text-sm leading-relaxed">
        Đường dẫn bạn truy cập không hợp lệ trên cổng quản trị LinkkWork. Vui lòng kiểm tra lại URL hoặc quay về bảng điều khiển trung tâm.
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
