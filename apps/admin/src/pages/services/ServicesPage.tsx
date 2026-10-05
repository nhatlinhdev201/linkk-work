import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { ServiceItem, ServiceCategory, PricingModel } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Switch } from '../../components/common/Switch';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Tabs } from '../../components/common/Tabs';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Sparkles,
  PlusCircle,
  Clock,
  Layers,
  CheckCircle,
  Tag,
  DollarSign,
  Search,
} from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const { currentTenantId, currentTenantName, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Service Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    categoryId: 'cat-cleaning',
    description: '',
    pricingModel: 'HOURLY' as PricingModel,
    basePrice: 85000,
    unitLabel: 'giờ',
    minHours: 2,
    addonName: '',
    addonPrice: 30000,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [catList, srvList] = await Promise.all([
        api.getServiceCategories(),
        api.getServices(currentTenantId),
      ]);
      setCategories(catList);
      setServices(srvList);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh mục dịch vụ';
      toast({
        type: 'error',
        title: 'Lỗi nạp dữ liệu',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentTenantId]);

  const handleToggleActive = async (service: ServiceItem) => {
    try {
      const updated = await api.toggleServiceActive(service.id, !service.isActive);
      toast({
        type: updated.isActive ? 'success' : 'warning',
        title: updated.isActive ? 'Đã kích hoạt dịch vụ' : 'Đã tạm dừng dịch vụ',
        message: `Dịch vụ "${updated.name}" đã ${updated.isActive ? 'mở nhận đơn' : 'tạm ngưng'}.`,
      });
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi cập nhật dịch vụ';
      toast({
        type: 'error',
        title: 'Thao tác thất bại',
        message,
      });
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({
        type: 'warning',
        title: 'Thiếu tên dịch vụ',
        message: 'Vui lòng nhập tên dịch vụ.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const cat = categories.find((c) => c.id === form.categoryId);
      const categoryName = cat ? cat.name : 'Dịch vụ chung';

      const addons = form.addonName.trim()
        ? [
            {
              id: `add-${Date.now()}`,
              name: form.addonName.trim(),
              price: Number(form.addonPrice),
            },
          ]
        : [];

      await api.createService({
        name: form.name.trim(),
        slug: form.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-'),
        categoryId: form.categoryId,
        categoryName,
        description: form.description.trim() || 'Dịch vụ chuyên nghiệp chất lượng cao',
        pricingModel: form.pricingModel,
        basePrice: Number(form.basePrice),
        unitLabel: form.unitLabel,
        minHours: form.pricingModel === 'HOURLY' ? Number(form.minHours) : undefined,
        isActive: true,
        tenantId: isSuperAdmin ? undefined : currentTenantId,
        addons,
      });

      toast({
        type: 'success',
        title: 'Khởi tạo thành công!',
        message: `Dịch vụ "${form.name}" đã được đưa vào danh mục sẵn sàng cung cấp.`,
      });

      setIsModalOpen(false);
      setForm({
        name: '',
        categoryId: 'cat-cleaning',
        description: '',
        pricingModel: 'HOURLY',
        basePrice: 85000,
        unitLabel: 'giờ',
        minHours: 2,
        addonName: '',
        addonPrice: 30000,
      });

      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tạo dịch vụ';
      toast({
        type: 'error',
        title: 'Khởi tạo thất bại',
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredServices = services.filter((s) => {
    const matchCategory =
      selectedCategory === 'ALL' || s.categoryId === selectedCategory;
    const matchSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const tabItems = [
    { id: 'ALL', label: 'Tất cả', count: services.length },
    ...categories.map((c) => ({
      id: c.id,
      label: c.name,
      count: services.filter((s) => s.categoryId === c.id).length,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-brand-500" />
            Danh mục Dịch vụ &amp; Bảng giá
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Đơn vị:{' '}
            <span className="font-semibold text-brand-600">{currentTenantName}</span>. Cấu hình
            đơn giá theo giờ, theo đơn vị, gói thầu RFQ và dịch vụ bán kèm (Add-ons).
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<PlusCircle className="w-4 h-4" />}
        >
          Thêm dịch vụ mới
        </Button>
      </div>

      {/* Filter and Tabs */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <Tabs
            tabs={tabItems}
            activeTab={selectedCategory}
            onChange={setSelectedCategory}
            size="sm"
          />

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên dịch vụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Đang tải danh mục dịch vụ...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-8 h-8 text-brand-400" />}
          title="Không tìm thấy dịch vụ nào"
          description="Hãy thử chọn danh mục khác hoặc bấm 'Thêm dịch vụ mới' để bắt đầu mở bán."
          action={
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Thêm dịch vụ
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => {
            const isHourly = service.pricingModel === 'HOURLY';
            const isBidding = service.pricingModel === 'BIDDING';

            return (
              <Card
                key={service.id}
                className={`relative overflow-hidden transition-all duration-150 ${
                  service.isActive
                    ? 'border-slate-200'
                    : 'border-slate-200 bg-slate-50/70 opacity-80'
                }`}
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    service.isActive ? 'bg-brand-500' : 'bg-slate-300'
                  }`}
                />

                <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full inline-block">
                      {service.categoryName}
                    </span>
                    <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                      {service.name}
                    </CardTitle>
                  </div>

                  <Switch
                    checked={service.isActive}
                    onChange={() => handleToggleActive(service)}
                  />
                </CardHeader>

                <CardContent className="space-y-3.5 pt-1 text-xs">
                  <p className="text-slate-500 leading-relaxed line-clamp-2">
                    {service.description}
                  </p>

                  {/* Pricing Box */}
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Cơ chế định giá:
                      </span>
                      <Badge
                        variant={isHourly ? 'brand' : isBidding ? 'warning' : 'info'}
                        size="sm"
                      >
                        {isHourly
                          ? 'Theo giờ làm việc'
                          : isBidding
                          ? 'Đấu thầu báo giá'
                          : 'Theo đơn vị cố định'}
                      </Badge>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Mức giá cơ bản:
                      </span>
                      <span className="text-base font-black text-slate-900">
                        {isBidding
                          ? 'Khảo sát báo giá'
                          : `${service.basePrice.toLocaleString('vi-VN')} đ / ${
                              service.unitLabel || 'lần'
                            }`}
                      </span>
                    </div>
                  </div>

                  {/* Add-ons list */}
                  {service.addons && service.addons.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-brand-500" />
                        Dịch vụ & Dụng cụ bán kèm (+Add-ons):
                      </span>
                      <div className="space-y-1">
                        {service.addons.map((addon) => (
                          <div
                            key={addon.id}
                            className="flex items-center justify-between py-1 px-2 rounded-lg bg-orange-50/50 text-[11px] text-slate-700"
                          >
                            <span className="truncate max-w-[190px]">{addon.name}</span>
                            <span className="font-bold text-brand-700 shrink-0">
                              +{addon.price.toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Mã: {service.id}</span>
                    <span className="font-medium text-slate-600">
                      {service.tenantId ? 'Dịch vụ riêng' : 'Toàn sàn LinkkWork'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Thêm Dịch Vụ Mới Vào Danh Mục"
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateService}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang khởi tạo...' : 'Lưu & Bật Cung Cấp'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateService} className="space-y-4">
          <Input
            label="Tên dịch vụ *"
            placeholder="Ví dụ: Vệ sinh máy giặt lồng đứng"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Nhóm ngành danh mục"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />

            <Select
              label="Phương thức định giá"
              value={form.pricingModel}
              onChange={(e) =>
                setForm({ ...form, pricingModel: e.target.value as PricingModel })
              }
              options={[
                { value: 'HOURLY', label: 'Theo giờ (Hourly)' },
                { value: 'PER_UNIT', label: 'Theo đơn vị (Per-unit)' },
                { value: 'BIDDING', label: 'Đấu thầu báo giá (RFQ)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Đơn giá cơ bản (VNĐ) *"
              type="number"
              value={form.basePrice}
              onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
              required
            />
            <Input
              label="Đơn vị tính"
              placeholder="giờ / cái / bộ"
              value={form.unitLabel}
              onChange={(e) => setForm({ ...form, unitLabel: e.target.value })}
            />
            {form.pricingModel === 'HOURLY' && (
              <Input
                label="Số giờ tối thiểu"
                type="number"
                min={1}
                max={8}
                value={form.minHours}
                onChange={(e) => setForm({ ...form, minHours: Number(e.target.value) })}
              />
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Mô tả chi tiết</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Quy trình thực hiện, cam kết chất lượng..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="text-xs font-bold text-slate-800 block">
              Dịch vụ bán kèm ban đầu (+Addon):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Tên dụng cụ / yêu cầu thêm..."
                value={form.addonName}
                onChange={(e) => setForm({ ...form, addonName: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Giá phụ thu (VNĐ)"
                value={form.addonPrice}
                onChange={(e) => setForm({ ...form, addonPrice: Number(e.target.value) })}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
