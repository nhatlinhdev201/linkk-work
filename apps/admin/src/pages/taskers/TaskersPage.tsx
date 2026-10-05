import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Tasker } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastContext';
import { Card, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Tabs } from '../../components/common/Tabs';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Users,
  Search,
  Star,
  ShieldCheck,
  Phone,
} from 'lucide-react';

export const TaskersPage: React.FC = () => {
  const { currentTenantId, currentTenantName } = useAuth();
  const { toast } = useToast();

  const [taskers, setTaskers] = useState<Tasker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineFilter, setOnlineFilter] = useState<string>('ALL');

  const loadTaskers = async () => {
    setLoading(true);
    try {
      const data = await api.getTaskers(currentTenantId);
      setTaskers(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi tải danh sách thợ';
      toast({
        type: 'error',
        title: 'Lỗi tải dữ liệu',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaskers();
  }, [currentTenantId]);

  const filteredTaskers = taskers.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone.includes(searchQuery) ||
      (t.skills && t.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())));

    if (onlineFilter === 'ONLINE') return matchSearch && t.isOnline;
    if (onlineFilter === 'OFFLINE') return matchSearch && !t.isOnline;
    return matchSearch;
  });

  const onlineCount = taskers.filter((t) => t.isOnline).length;

  const filterTabs = [
    { id: 'ALL', label: 'Tất cả nhân sự', count: taskers.length },
    { id: 'ONLINE', label: 'Đang trực tuyến', count: onlineCount },
    { id: 'OFFLINE', label: 'Ngoại tuyến', count: taskers.length - onlineCount },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-brand-500" />
            Đội ngũ Thợ &amp; Đối tác Cung ứng
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Đơn vị quản trị:{' '}
            <span className="font-semibold text-brand-600">{currentTenantName}</span>. Theo dõi
            nhân sự, xác thực KYC, số dư ký quỹ và hiệu suất phục vụ.
          </p>
        </div>

        <Badge variant="brand" size="md">
          {onlineCount} thợ sẵn sàng nhận việc
        </Badge>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <Tabs
          tabs={filterTabs}
          activeTab={onlineFilter}
          onChange={setOnlineFilter}
          size="sm"
        />

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên thợ, số điện thoại, kỹ năng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Taskers Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Đang tải hồ sơ nhân sự...</p>
        </div>
      ) : filteredTaskers.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-brand-400" />}
          title="Không tìm thấy thợ nào"
          description="Hãy thử nhập từ khóa tìm kiếm khác hoặc chuyển bộ lọc."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTaskers.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-4">
                {/* Header: Avatar, Name, Online status */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-base border-2 border-white shadow-xs">
                        {t.name.slice(0, 1)}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          t.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        {t.name}
                        {t.kycVerified && (
                          <span title="Đã xác minh KYC (CCCD & Lý lịch tư pháp)">
                            <ShieldCheck className="w-4 h-4 text-blue-500" />
                          </span>
                        )}
                      </h3>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {t.phone}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      t.isOnline
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {t.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-xl text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Đánh giá</span>
                    <span className="font-bold text-xs text-amber-600 flex items-center justify-center gap-0.5 mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      {t.ratingScore || t.rating}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Đã xong</span>
                    <span className="font-bold text-xs text-slate-800 mt-0.5 block">
                      {t.completedJobs} đơn
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Ký quỹ</span>
                    <span
                      className={`font-bold text-xs mt-0.5 block ${
                        t.depositBalance >= 100000 ? 'text-slate-800' : 'text-rose-600'
                      }`}
                    >
                      {((t.depositBalance || 0) / 1000).toFixed(0)}k đ
                    </span>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1.5">
                    Kỹ năng &amp; Chuyên môn:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {t.skills &&
                      t.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-700 rounded-md font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                  </div>
                </div>

                {/* Footer Info */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Mã đối tác: {t.id}</span>
                  <span className="text-slate-600 font-medium">
                    {t.tenantId === 'tenant-linkkwork' ? 'Đội ngũ Sàn' : 'Nội bộ Đối tác'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
