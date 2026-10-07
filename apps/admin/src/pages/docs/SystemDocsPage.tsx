import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Tabs } from '../../components/common/Tabs';
import {
  BookOpen,
  Search,
  ShieldCheck,
  Building2,
  Users,
  UserCheck,
  Radio,
  Cpu,
  Layers,
  ArrowRight,
  Wallet,
  Clock,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
  Compass,
  AlertTriangle,
  Briefcase,
} from 'lucide-react';

type ActorTab = 'ALL' | 'OVERVIEW' | 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'TASKER' | 'CUSTOMER' | 'SYSTEM_ENGINE';

interface ApiEndpointItem {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  desc: string;
  role: string;
}

export const SystemDocsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActorTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const actorTabs = [
    { id: 'ALL', label: 'Tất cả tài liệu' },
    { id: 'OVERVIEW', label: '🏛️ Tổng quan & Kiến trúc' },
    { id: 'SUPER_ADMIN', label: '👑 Super Admin' },
    { id: 'TENANT_ADMIN', label: '🏢 Tenant Admin' },
    { id: 'TASKER', label: '👷 Tasker (Thợ)' },
    { id: 'CUSTOMER', label: '👤 Khách hàng' },
    { id: 'SYSTEM_ENGINE', label: '🤖 System Engine' },
  ];

  const handleCopy = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const apiEndpoints: ApiEndpointItem[] = [
    { method: 'GET', path: '/api/v1/auth/me', desc: 'Lấy thông tin tài khoản hiện tại & tenant context', role: 'All Users' },
    { method: 'POST', path: '/api/v1/tenants/register', desc: 'Đăng ký hồ sơ đối tác doanh nghiệp mới', role: 'Public' },
    { method: 'PATCH', path: '/api/v1/tenants/:id/review', desc: 'Duyệt (APPROVED) hoặc Từ chối (REJECTED) đối tác', role: 'Super Admin' },
    { method: 'GET', path: '/api/v1/bookings', desc: 'Truy vấn danh sách đơn hàng có phân trang & cô lập tenant', role: 'Admin' },
    { method: 'POST', path: '/api/v1/bookings', desc: 'Tạo đơn mới với Snapshot giá Server-Side Authoritative', role: 'Customer / Admin' },
    { method: 'POST', path: '/api/v1/bookings/:id/assign', desc: 'Chỉ định trực tiếp thợ cho đơn hàng (hỗ trợ liên sàn)', role: 'Admin' },
    { method: 'POST', path: '/api/v1/bookings/:id/broadcast', desc: 'Bắn đơn lên sàn radar diện rộng (atomic claim CAS)', role: 'Admin' },
    { method: 'PATCH', path: '/api/v1/bookings/:id/status', desc: 'Chuyển trạng thái đơn tuân thủ Booking State Machine', role: 'Admin / Tasker' },
    { method: 'GET', path: '/api/v1/taskers', desc: 'Danh sách thợ, tính toán availability & ca việc activeJob', role: 'Admin' },
    { method: 'POST', path: '/api/v1/taskers', desc: 'Đăng ký thợ mới, hồ sơ năng lực & bút toán ký quỹ ban đầu', role: 'Admin' },
    { method: 'PATCH', path: '/api/v1/taskers/:id/work-floor', desc: 'Cấu hình bán kính quét việc (1-100km) & radar tự động', role: 'Admin / Tasker' },
    { method: 'PATCH', path: '/api/v1/taskers/:id/toggle-status', desc: 'Bật/tắt ca trực tuyến (isOnline) nhận việc', role: 'Admin / Tasker' },
    { method: 'POST', path: '/api/v1/taskers/:id/deposit', desc: 'Nạp / Khấu trừ ký quỹ (ghi Sổ cái WalletTransaction)', role: 'Admin' },
    { method: 'PATCH', path: '/api/v1/taskers/:id/kyc', desc: 'Xác thực căn cước công dân (CCCD) cho thợ', role: 'Admin' },
    { method: 'GET', path: '/api/v1/taskers/:id/transactions', desc: 'Lịch sử giao dịch sổ cái kép (WalletTransaction) của thợ', role: 'Admin / Tasker' },
    { method: 'GET', path: '/api/v1/bookings/available-taskers', desc: 'Danh sách thợ khả dụng phục vụ điều phối kèm availability & activeJob', role: 'Admin' },
  ];

  const filteredEndpoints = useMemo(() => {
    if (!searchQuery.trim()) return apiEndpoints;
    const q = searchQuery.toLowerCase();
    return apiEndpoints.filter(
      (e) => e.path.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q) || e.role.toLowerCase().includes(q)
    );
  }, [searchQuery, apiEndpoints]);

  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.trim().toLowerCase());
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 text-white rounded-3xl p-7 sm:p-9 shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold border border-brand-500/30">
            <BookOpen className="w-3.5 h-3.5" />
            LinkkWork Enterprise Knowledge Base &amp; System Docs
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Trung Tâm Tài Liệu &amp; Quy Chuẩn Hệ Thống
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Tài liệu nghiệp vụ chính thức dành cho các Actors (Super Admin, Tenant Admin, Tasker, Khách hàng) và
            Động cơ Kỹ thuật (Multi-tenant, Sổ cái kép bất biến, State Machine và Radar Matching).
          </p>
        </div>

        {/* Search Bar within Banner */}
        <div className="relative z-10 mt-6 max-w-xl">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm quy trình, phân quyền, API endpoint, thuật toán..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-800/90 text-white border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-400 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Xóa
              </button>
            )}
          </div>
        </div>

        {/* Background glow decoration */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Actor Segmented Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <Tabs
          tabs={actorTabs}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as ActorTab)}
          size="sm"
        />
        <div className="text-xs text-slate-500 flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Phiên bản hệ thống: <strong className="font-mono text-slate-800">v2.4.0 (Live)</strong>
        </div>
      </div>

      {/* SECTION 1: OVERVIEW & ARCHITECTURE */}
      {(activeTab === 'ALL' || activeTab === 'OVERVIEW') &&
        (matchesSearch('tổng quan') || matchesSearch('kiến trúc') || matchesSearch('multi-tenant') || matchesSearch('sổ cái')) && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                1. Tổng quan Nền tảng &amp; Kiến trúc Kỹ thuật (Overview &amp; Architecture)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card className="border-slate-200 shadow-2xs">
                <CardContent className="p-5 space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    🏢
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Kiến trúc Multi-Tenant Cách ly</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Mỗi đối tác doanh nghiệp là một Tenant độc lập sở hữu nhân sự thợ, cấu hình bảng giá và phạm vi quản lý riêng biệt.
                    Tenant Admin chỉ truy xuất dữ liệu thuộc phạm vi đơn vị mình; Super Admin toàn quyền giám sát và can thiệp liên sàn.
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                    <Badge variant="neutral" size="sm">Tenant Isolation</Badge>
                    <Badge variant="neutral" size="sm">RBAC Guards</Badge>
                    <Badge variant="neutral" size="sm">Prisma Middleware</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-2xs">
                <CardContent className="p-5 space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    ⚖️
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Sổ cái Kế toán kép Bất biến</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Mọi biến động số dư ký quỹ (nạp, trừ, tạm giữ, trả cọc) đều được ghi nhận vào bảng <code>wallet_transactions</code> với
                    mã định danh duy nhất (<code>TX-YYYY-XXXXXX</code>), lưu trữ <code>balanceBefore</code>, <code>balanceAfter</code> trong ACID Transaction.
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                    <Badge variant="neutral" size="sm">ACID Transaction</Badge>
                    <Badge variant="neutral" size="sm">Zero Negative Balance</Badge>
                    <Badge variant="neutral" size="sm">Audit Trail</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-2xs">
                <CardContent className="p-5 space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                    ⚡
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Động cơ State Machine &amp; Radar</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Vòng đời đơn hàng tuân thủ nghiêm ngặt 10 trạng thái hữu hạn. Thuật toán phân phối radar diện rộng kết hợp cơ chế
                    khóa nguyên tử (Atomic CAS Claim) trên Redis đảm bảo không bao giờ xảy ra tình trạng 2 thợ cùng nhận 1 đơn.
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                    <Badge variant="neutral" size="sm">Redis Fast-Claim</Badge>
                    <Badge variant="neutral" size="sm">Haversine Radar</Badge>
                    <Badge variant="neutral" size="sm">Event Logging</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Workflow Stepper Diagram */}
            <Card className="border-slate-200 bg-slate-50/60 shadow-2xs">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
                  Chuỗi Tiến Trình Vòng Đời Đơn Hàng (Booking State Machine Flow)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 text-center">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block">BƯỚC 1</span>
                    <span className="font-bold text-xs text-amber-700">PENDING_DISPATCH</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Chờ điều phối</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block">BƯỚC 2</span>
                    <span className="font-bold text-xs text-blue-700">ASSIGNED</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Đã gán thợ</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block">BƯỚC 3</span>
                    <span className="font-bold text-xs text-indigo-700">ARRIVING</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Thợ xuất phát</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block">BƯỚC 4</span>
                    <span className="font-bold text-xs text-purple-700">IN_PROGRESS</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Đang làm việc</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block">BƯỚC 5</span>
                    <span className="font-bold text-xs text-amber-800">PENDING_ACCEPTANCE</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Chờ nghiệm thu</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-300 bg-emerald-50/50 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-600 block">BƯỚC 6</span>
                    <span className="font-bold text-xs text-emerald-800">COMPLETED</span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">Hoàn tất đơn</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Docs-as-Code & Subagent Standards */}
            <Card className="border-slate-200 shadow-2xs bg-gradient-to-r from-slate-50 to-brand-50/30">
              <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-brand-600" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      Quy chuẩn Docs-as-Code &amp; Tự động hóa Tài liệu (Rule 10 CODING_STANDARDS)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                    Toàn bộ thay đổi về kiến trúc, state machine, API contracts và phân quyền RBAC luôn được duy trì đồng bộ 100% giữa tài liệu kỹ thuật dự án (<code>docs/</code>) và trang tài liệu trực quan này (<code>SystemDocsPage.tsx</code>) bởi subagent chuyên trách <code>docs-maintainer</code>, loại bỏ hoàn toàn hiện tượng lệch pha (code drift).
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <Badge variant="success" size="sm">Single Source of Truth</Badge>
                  <Badge variant="brand" size="sm">Zero Code Drift</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      {/* SECTION 2: SUPER ADMIN */}
      {(activeTab === 'ALL' || activeTab === 'SUPER_ADMIN') &&
        (matchesSearch('super admin') || matchesSearch('đối tác') || matchesSearch('duyệt') || matchesSearch('cron') || matchesSearch('toàn sàn')) && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                2. Vai trò Quản trị Toàn sàn (Super Admin Portal)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card className="border-slate-200 shadow-2xs">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Thẩm định Đối tác Doanh nghiệp (Partner Onboarding)
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Tiếp nhận đơn đăng ký đối tác (Tên công ty, MST, người liên hệ, giấy phép, khu vực hoạt động).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Phê duyệt (APPROVED) tự động khởi tạo Tenant mới, tài khoản Tenant Admin và kích hoạt quyền vận hành.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Từ chối (REJECTED) kèm ghi chú lý do rõ ràng gửi phản hồi cho đối tác.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-2xs">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    Điều phối Liên sàn &amp; Tự động hóa Cron Jobs
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Quyền điều phối vượt ranh giới Tenant: Gán thợ của đơn vị khác cho đơn hàng khẩn cấp.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Giám sát 4 tiến trình Cron tự động: Quét đơn trễ, hết hạn radar, sao lưu sổ cái tài chính và nhịp tim Redis.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Kích hoạt chạy thủ công (Trigger Run) hoặc tạm dừng (Pause) cron jobs theo thời gian thực.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

      {/* SECTION 3: TENANT ADMIN */}
      {(activeTab === 'ALL' || activeTab === 'TENANT_ADMIN') &&
        (matchesSearch('tenant admin') || matchesSearch('hrm') || matchesSearch('bàn điều phối') || matchesSearch('nhân sự') || matchesSearch('ký quỹ')) && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                3. Vai trò Đơn vị Đối tác Cung cấp (Tenant Admin Portal)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card className="border-slate-200 shadow-2xs">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Quản trị Nhân sự &amp; Tài chính Thợ (HRM &amp; Ledger)
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Đăng ký hồ sơ thợ mới: Họ tên, SĐT di động Việt Nam, kỹ năng chuyên môn, CCCD, số dư ký quỹ ban đầu.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Quản lý ký quỹ: Nạp hoặc khấu trừ tiền cọc với cảnh báo trực quan khi số dư &lt; 100.000đ.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Duyệt danh tính KYC: Bảo vệ an toàn bằng hộp thoại xác nhận <code>useConfirm</code>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Tra cứu Sổ cái 360 độ: Theo dõi chi tiết mọi bút toán biến động số dư của từng nhân sự.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-2xs">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-600" />
                    Bàn Điều Phối &amp; Thiết lập Sàn làm việc (Dispatch Console)
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Chỉ định thợ trực tiếp: Gán công việc cho thợ đủ điều kiện (chỉ định trong đơn vị hoặc thợ toàn sàn).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Bắn đơn Radar diện rộng: Mở đơn trên sàn cho các thợ trong bán kính quét cuốc tự động nhận.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Xử lý ca việc liên hoàn: Báo xuất phát, Bắt đầu làm, Báo xong ca, Nghiệm thu &amp; Đánh giá sao, Hủy đơn.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Thiết lập sàn thợ: Cấu hình bán kính quét (1-100km), bật/tắt radar tự động và quản lý ca trực.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

      {/* SECTION 4: TASKER */}
      {(activeTab === 'ALL' || activeTab === 'TASKER') &&
        (matchesSearch('tasker') || matchesSearch('thợ') || matchesSearch('trạng thái') || matchesSearch('sẵn sàng') || matchesSearch('lương')) && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                4. Cơ chế Vận hành Nhân sự Thợ (Tasker State &amp; Availability Engine)
              </h2>
            </div>

            {/* Availability Matrix */}
            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">
                  Mô Hình Trạng Thái 3 Tầng &amp; 7 Mã Khả Dụng (Availability Engine)
                </h3>
                <p className="text-xs text-slate-600">
                  Hệ thống tự động tính toán thời gian thực xem thợ có đủ điều kiện nhận việc và quét radar hay không dựa trên 3 tầng kiểm tra chặt chẽ:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      🟢 READY (Sẵn sàng)
                    </span>
                    <p className="text-[11px] text-emerald-700">
                      Bật trực tuyến + Ký quỹ &gt;= 100k + Duyệt KYC + Rảnh việc (IDLE) + Bật radar tự động.
                    </p>
                  </div>

                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                      🟡 BUSY (Đang làm việc)
                    </span>
                    <p className="text-[11px] text-indigo-700">
                      Thợ đang thực hiện đơn hàng (ASSIGNED, ARRIVING, IN_PROGRESS hoặc PENDING_ACCEPTANCE).
                    </p>
                  </div>

                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                      🔴 LOW_DEPOSIT (Nợ cọc)
                    </span>
                    <p className="text-[11px] text-rose-700">
                      Số dư ký quỹ dưới ngưỡng an toàn 100.000đ. Hệ thống tự động chặn nhận đơn để bảo toàn tài chính.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                      🟠 UNVERIFIED_KYC (Chờ KYC)
                    </span>
                    <p className="text-[11px] text-amber-700">
                      Hồ sơ chưa được duyệt thông tin căn cước công dân (CCCD).
                    </p>
                  </div>

                  <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      ⚫ OFFLINE (Ngoại tuyến)
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Thợ tắt ca trực tuyến, không có mặt trên bản đồ radar nhận cuốc.
                    </p>
                  </div>

                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-purple-800 flex items-center gap-1.5">
                      🟣 RADAR_DISABLED (Tắt radar)
                    </span>
                    <p className="text-[11px] text-purple-700">
                      Thợ tắt chế độ tự động quét việc; chỉ có thể nhận đơn khi Admin chỉ định trực tiếp bằng tay.
                    </p>
                  </div>

                  <div className="p-3 bg-red-50 border border-red-300 rounded-xl space-y-1 sm:col-span-2 lg:col-span-3">
                    <span className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                      ⛔ RESTRICTED (Bị giới hạn / Tạm khóa)
                    </span>
                    <p className="text-[11px] text-red-700">
                      Tài khoản thợ hoặc trạng thái hồ sơ bị khóa do vi phạm chính sách hoặc đang xử lý khiếu nại chất lượng. Tuyệt đối không thể nhận bất kỳ công việc nào.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lifecycle Sync & Active Job Tracking */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card className="border-slate-200 shadow-2xs">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Đồng Bộ Hai Chiều BookingState - TaskerProfile trong ACID Transaction
                  </h3>
                  <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                    <p>
                      Mọi bước chuyển trạng thái đơn hàng đều cập nhật đồng thời trạng thái thợ (<code>currentStatus</code>) trong giao dịch cơ sở dữ liệu nguyên tử (<code>prisma.$transaction</code>):
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                      <li><strong>Gán thợ (ASSIGNED):</strong> Profile thợ cập nhật <code>ASSIGNED</code>. Nếu đổi thợ khác, thợ cũ tự động hoàn trả về <code>IDLE</code> khi không còn đơn đang xử lý.</li>
                      <li><strong>Di chuyển &amp; Thi công:</strong> Đồng bộ theo thời gian thực sang <code>ARRIVING</code>, <code>IN_PROGRESS</code>, <code>PENDING_ACCEPTANCE</code>.</li>
                      <li><strong>Hoàn thành / Hủy:</strong> Tăng bộ đếm <code>completedJobsCount</code> (+1), tự động kiểm tra số đơn còn lại và trả thợ về <code>IDLE</code>.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-2xs">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-brand-600" />
                    Theo Dõi Ca Việc Đang Thực Hiện (Active Job Tracking)
                  </h3>
                  <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                    <p>
                      Hệ thống tự động gắn kèm cấu trúc dữ liệu <code>activeJob</code> vào hồ sơ thợ khi có đơn hàng chưa hoàn tất:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                      <li><strong>Dữ liệu đính kèm:</strong> Mã đơn (<code>bookingCode</code>), tên dịch vụ, khách hàng, số điện thoại liên hệ, địa chỉ thi công, giá tiền và trạng thái.</li>
                      <li><strong>Thao tác 1-Click:</strong> Thẻ việc nổi bật trên Drawer chi tiết thợ cung cấp nút liên kết trực tiếp sang Bàn Điều Phối (<code>/dispatch</code>) để can thiệp kịp thời.</li>
                      <li><strong>Huy hiệu trực quan:</strong> Danh sách thợ hiển thị rõ ràng nhãn Sẵn sàng (🟢) hoặc Đang làm việc (🟡 kèm mã đơn).</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Financial model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card className="border-slate-200 shadow-2xs">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    Cơ chế Đa ví Tài chính (Deposit vs Wallet)
                  </h3>
                  <div className="space-y-2 text-xs text-slate-600">
                    <p>
                      <strong>1. Ví ký quỹ đảm bảo (Deposit Balance):</strong> Dùng làm tài sản đảm bảo khi nhận đơn. Khi hoàn tất đơn,
                      hệ thống tự động trích phí hoa hồng sàn (15%) từ ví ký quỹ. Ngưỡng chặn tối thiểu là 100.000đ.
                    </p>
                    <p>
                      <strong>2. Ví thu nhập khả dụng (Wallet Balance):</strong> Tích lũy tiền công sau khi khách hàng nghiệm thu hoàn tất đơn.
                      Thợ có thể yêu cầu quyết toán chuyển khoản về ngân hàng đã đăng ký.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-2xs">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Compass className="w-4 h-4 text-brand-600" />
                    Mô hình Trả lương &amp; Chia sẻ Doanh thu
                  </h3>
                  <div className="space-y-2 text-xs text-slate-600">
                    <p>
                      <strong>• Hoa hồng theo cuốc (COMMISSION - Mặc định 85/15):</strong> Thợ nhận 85% giá trị hợp đồng dịch vụ; sàn/đối tác giữ 15% phí hoa hồng quản lý.
                    </p>
                    <p>
                      <strong>• Lương cứng định kỳ (FIXED_SALARY):</strong> Áp dụng cho nhân sự biên chế chính thức; doanh thu đơn hàng đổ toàn bộ về tài khoản Tenant quản trị.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

      {/* SECTION 5: CUSTOMER */}
      {(activeTab === 'ALL' || activeTab === 'CUSTOMER') &&
        (matchesSearch('khách hàng') || matchesSearch('customer') || matchesSearch('đặt dịch vụ') || matchesSearch('giá động') || matchesSearch('nghiệm thu')) && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                5. Quy Trình Trải Nghiệm Khách Hàng (Customer &amp; Booking Experience)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card className="border-slate-200 shadow-2xs">
                <CardContent className="p-5 space-y-3">
                  <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                    01
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">Đặt dịch vụ Linh hoạt</h3>
                  <p className="text-xs text-slate-600">
                    Khách hàng lựa chọn dịch vụ theo giờ (HOURLY), theo thiết bị (PER_UNIT) hoặc khảo sát báo giá (BIDDING),
                    chọn dịch vụ cộng thêm (Addons), địa chỉ và thời gian phục vụ.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-2xs">
                <CardContent className="p-5 space-y-3">
                  <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                    02
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">Giá Động &amp; Minh Bạch</h3>
                  <p className="text-xs text-slate-600">
                    Giá được tính toán độc quyền bởi PricingEngine trên Server: Bao gồm giá gốc, phụ phí khu vực, hệ số cao điểm (Surge Multiplier)
                    và voucher giảm giá được lưu snapshot bất biến.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-2xs">
                <CardContent className="p-5 space-y-3">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                    03
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">Nghiệm thu &amp; Đánh giá</h3>
                  <p className="text-xs text-slate-600">
                    Sau khi thợ báo hoàn thành (PENDING_ACCEPTANCE), khách hàng kiểm tra chất lượng, xác nhận nghiệm thu và đánh giá 1-5 sao kèm nhận xét phản hồi.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

      {/* SECTION 6: SYSTEM ENGINE */}
      {(activeTab === 'ALL' || activeTab === 'SYSTEM_ENGINE') &&
        (matchesSearch('engine') || matchesSearch('thuật toán') || matchesSearch('radar') || matchesSearch('redis') || matchesSearch('api')) && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-rose-600" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                6. Động Cơ Kỹ Thuật &amp; Thuật Toán Điều Phối (System Engine Specs)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card className="border-slate-200 shadow-2xs">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Radio className="w-4 h-4 text-rose-600" />
                    Thuật toán Quét Radar &amp; Ghép nối (Matching Engine)
                  </h3>
                  <div className="space-y-2 text-xs text-slate-600">
                    <p>
                      <strong>• Công thức Haversine:</strong> Đo đạc khoảng cách cầu chính xác giữa tọa độ thợ (<code>currentLat</code>, <code>currentLng</code>) và điểm hẹn khách hàng.
                    </p>
                    <p>
                      <strong>• Bộ lọc 5 tầng:</strong>
                      <br />1. Thợ thuộc Tenant quản lý đơn (hoặc thợ toàn sàn nếu Super Admin kích hoạt).
                      <br />2. Bật ca trực tuyến (<code>isOnline = true</code>).
                      <br />3. Ký quỹ khả dụng <code>depositBalance &gt;= 100.000đ</code>.
                      <br />4. Trạng thái rảnh việc <code>currentStatus = 'IDLE'</code>.
                      <br />5. Khớp ít nhất 1 kỹ năng yêu cầu của dịch vụ.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-2xs">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    Khóa Nguyên tử Atomic CAS Claim trên Redis
                  </h3>
                  <div className="space-y-2 text-xs text-slate-600">
                    <p>
                      Khi đơn hàng ở trạng thái <code>BROADCASTING</code>, Redis lưu trữ key <code>job:status:&#123;bookingId&#125; = 'OPEN'</code>.
                    </p>
                    <p>
                      Thợ bấm nhận đơn sẽ thực hiện thao tác so sánh và hoán đổi nguyên tử (Compare-and-Set). Yêu cầu đầu tiên thành công sẽ chuyển trạng thái sang <code>ASSIGNED</code>;
                      mọi yêu cầu đến sau trong cùng mili-giây sẽ lập tức nhận thông báo từ chối 409 Conflict, loại bỏ 100% rủi ro tranh chấp đơn (Race Condition).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

      {/* SECTION 7: RBAC MATRIX */}
      {(activeTab === 'ALL' || activeTab === 'OVERVIEW' || activeTab === 'SUPER_ADMIN' || activeTab === 'TENANT_ADMIN') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              7. Ma Trận Phân Quyền Vai Trò (Role-Based Access Control - RBAC Matrix)
            </h2>
          </div>

          <Card className="border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-bold">Chức năng / Nghiệp vụ</th>
                    <th className="py-3 px-4 font-bold text-center">Super Admin</th>
                    <th className="py-3 px-4 font-bold text-center">Tenant Admin</th>
                    <th className="py-3 px-4 font-bold text-center">Tasker</th>
                    <th className="py-3 px-4 font-bold text-center">Customer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-800">Thẩm định &amp; Duyệt đối tác Tenant</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">✅ Toàn quyền</td>
                    <td className="py-2.5 px-4 text-center text-slate-400">❌ Không</td>
                    <td className="py-2.5 px-4 text-center text-slate-400">❌ Không</td>
                    <td className="py-2.5 px-4 text-center text-slate-400">❌ Không</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-800">Cấu hình Cron Jobs &amp; Kỹ thuật sàn</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">✅ Toàn quyền</td>
                    <td className="py-2.5 px-4 text-center text-slate-400">❌ Không</td>
                    <td className="py-2.5 px-4 text-center text-slate-400">❌ Không</td>
                    <td className="py-2.5 px-4 text-center text-slate-400">❌ Không</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-800">Quản trị HRM Thợ (Thêm, Sửa, Duyệt KYC)</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">✅ Toàn sàn</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">✅ Đơn vị mình</td>
                    <td className="py-2.5 px-4 text-center text-slate-400">❌ Xem hồ sơ</td>
                    <td className="py-2.5 px-4 text-center text-slate-400">❌ Không</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-800">Nạp / Khấu trừ Ký quỹ Sổ cái</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">✅ Toàn sàn</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">✅ Đơn vị mình</td>
                    <td className="py-2.5 px-4 text-center text-slate-400">❌ Chỉ nạp cọc</td>
                    <td className="py-2.5 px-4 text-center text-slate-400">❌ Không</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-800">Điều phối Đơn &amp; Bắn Radar</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">✅ Liên sàn</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">✅ Nội bộ Tenant</td>
                    <td className="py-2.5 px-4 text-center text-slate-400">Nhận đơn radar</td>
                    <td className="py-2.5 px-4 text-center text-slate-400">❌ Không</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-800">Nghiệm thu &amp; Đánh giá sao</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">✅ Can thiệp</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">✅ Hỗ trợ khách</td>
                    <td className="py-2.5 px-4 text-center text-slate-400">Báo xong ca</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">✅ Chủ trì</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* SECTION 8: QUICK API ENDPOINTS CHEAT SHEET */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              8. Danh Mục API Endpoints Chuẩn Hóa ({filteredEndpoints.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">Bấm để sao chép đường dẫn API</span>
        </div>

        <Card className="border-slate-200 overflow-hidden shadow-2xs">
          <div className="divide-y divide-slate-100">
            {filteredEndpoints.map((ep, idx) => (
              <div
                key={idx}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                      ep.method === 'GET'
                        ? 'bg-blue-100 text-blue-800'
                        : ep.method === 'POST'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ep.method === 'PATCH'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-900 truncate">
                    {ep.path}
                  </span>
                  <span className="text-xs text-slate-500 hidden md:inline truncate">• {ep.desc}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0 justify-end">
                  <Badge variant="neutral" size="sm">
                    {ep.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(ep.path)}
                    icon={copiedPath === ep.path ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    title="Sao chép path"
                  >
                    {copiedPath === ep.path ? 'Đã chép' : 'Chép'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
