import React, { useState } from 'react';
import type { ServiceItem, PricingModel } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastContext';
import { useConfirm } from '../../components/feedback/ConfirmContext';
import {
  useServicesQuery,
  useServiceCategoriesQuery,
  useToggleServiceMutation,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useCreateAddonMutation,
} from '../../api/queries';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Switch } from '../../components/common/Switch';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Tabs } from '../../components/common/Tabs';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonCardGrid } from '../../components/common/Skeleton';
import { Pagination } from '../../components/common/Pagination';
import { serviceSchema } from '../../schemas/catalog.schema';
import { CategoryModal } from './CategoryModal';
import { AddonModal } from './AddonModal';
import {
  Sparkles,
  PlusCircle,
  Layers,
  Tag,
  Search,
  FolderTree,
  Edit2,
  Trash2,
} from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const { currentTenantId, currentTenantName, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();

  const { data: categories = [], isLoading: isLoadingCategories } = useServiceCategoriesQuery(true);
  const { data: services = [], isLoading: isLoadingServices } = useServicesQuery(currentTenantId);

  const toggleServiceMutation = useToggleServiceMutation(currentTenantId);
  const createServiceMutation = useCreateServiceMutation(currentTenantId);
  const updateServiceMutation = useUpdateServiceMutation(currentTenantId);
  const deleteServiceMutation = useDeleteServiceMutation(currentTenantId);
  const createAddonMutation = useCreateAddonMutation(currentTenantId);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Category & Addon Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedServiceForAddons, setSelectedServiceForAddons] = useState<ServiceItem | null>(null);

  // Service Create/Edit Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '',
    categoryId: 'cat-cleaning',
    description: '',
    pricingModel: 'HOURLY' as PricingModel,
    basePrice: 85000,
    unitLabel: 'giờ',
    durationHours: 2,
    minHours: 2,
    addonName: '',
    addonPrice: 30000,
  });

  // Open Create Service Modal with smart default from category
  const handleOpenCreateService = () => {
    setEditingService(null);
    const defaultCat = categories.find((c) => c.id === 'cat-cleaning') || categories[0];
    const categoryId = defaultCat?.id || 'cat-cleaning';

    setForm({
      name: '',
      categoryId,
      description: '',
      pricingModel: defaultCat?.defaultPricingType || 'HOURLY',
      basePrice: defaultCat?.defaultBasePrice ?? 85000,
      unitLabel: defaultCat?.defaultUnitLabel || (defaultCat?.defaultPricingType === 'HOURLY' ? 'giờ' : 'lần'),
      durationHours: 2,
      minHours: 2,
      addonName: '',
      addonPrice: 30000,
    });
    setFormErrors({});
    setIsServiceModalOpen(true);
  };

  // Open Edit Service Modal
  const handleOpenEditService = (service: ServiceItem) => {
    setEditingService(service);
    setForm({
      name: service.name,
      categoryId: service.categoryId,
      description: service.description || '',
      pricingModel: service.pricingModel,
      basePrice: service.basePrice,
      unitLabel: service.unitLabel || 'giờ',
      durationHours: service.durationHours ?? service.minHours ?? 2,
      minHours: service.minHours ?? 2,
      addonName: '',
      addonPrice: 30000,
    });
    setFormErrors({});
    setIsServiceModalOpen(true);
  };

  // Smart pricing inheritance when category selection changes in Service modal
  const handleCategoryChange = (newCatId: string) => {
    const targetCat = categories.find((c) => c.id === newCatId);

    if (targetCat) {
      // Auto pre-fill / inherit pricing configuration from the chosen category
      setForm((prev) => ({
        ...prev,
        categoryId: newCatId,
        pricingModel: targetCat.defaultPricingType || prev.pricingModel,
        basePrice: targetCat.defaultBasePrice ?? prev.basePrice,
        unitLabel:
          targetCat.defaultUnitLabel ||
          (targetCat.defaultPricingType === 'HOURLY'
            ? 'giờ'
            : targetCat.defaultPricingType === 'PER_UNIT'
            ? 'thiết bị'
            : 'lần'),
      }));
    } else {
      setForm((prev) => ({ ...prev, categoryId: newCatId }));
    }
  };

  const handleToggleActive = async (service: ServiceItem) => {
    const canModify = isSuperAdmin || (Boolean(service.tenantId) && service.tenantId === currentTenantId);
    if (!canModify) {
      toast({
        type: 'warning',
        title: 'Thao tác không được phép',
        message: 'Chỉ Super Admin mới có quyền bật/tắt dịch vụ toàn sàn.',
      });
      return;
    }

    const willDeactivate = service.isActive;
    const confirmed = await confirm({
      title: willDeactivate
        ? `Tạm ngừng cung cấp dịch vụ "${service.name}"?`
        : `Kích hoạt dịch vụ "${service.name}"?`,
      message: willDeactivate ? (
        <span>
          Khách hàng sẽ không thể đặt lịch mới cho dịch vụ <strong>&quot;{service.name}&quot;</strong> trên hệ thống
          cho đến khi bạn kích hoạt lại.
        </span>
      ) : (
        <span>
          Dịch vụ <strong>&quot;{service.name}&quot;</strong> sẽ được hiển thị công khai để khách hàng có thể đặt lịch.
        </span>
      ),
      variant: willDeactivate ? 'warning' : 'primary',
      confirmText: willDeactivate ? 'Tạm dừng dịch vụ' : 'Kích hoạt ngay',
      cancelText: 'Hủy bỏ',
    });
    if (!confirmed) return;

    try {
      await toggleServiceMutation.mutateAsync({
        serviceId: service.id,
        isActive: !service.isActive,
      });
    } catch {
      // Handled in mutation onError
    }
  };

  const handleDeleteService = async (service: ServiceItem) => {
    const canModify = isSuperAdmin || (Boolean(service.tenantId) && service.tenantId === currentTenantId);
    if (!canModify) {
      toast({
        type: 'warning',
        title: 'Thao tác không được phép',
        message: 'Chỉ Super Admin mới có quyền xóa dịch vụ toàn sàn.',
      });
      return;
    }

    const confirmed = await confirm({
      title: `Xóa dịch vụ "${service.name}"?`,
      message: (
        <span>
          Bạn có chắc chắn muốn xóa vĩnh viễn dịch vụ <strong>&quot;{service.name}&quot;</strong>?
          Thao tác này chỉ áp dụng cho dịch vụ chưa có đơn hàng đặt chỗ.
        </span>
      ),
      variant: 'danger',
      confirmText: 'Xóa dịch vụ',
      cancelText: 'Hủy bỏ',
    });
    if (!confirmed) return;

    try {
      await deleteServiceMutation.mutateAsync(service.id);
    } catch {
      // Handled in mutation onError
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();

    const parseResult = serviceSchema.safeParse({
      name: form.name.trim(),
      categoryId: form.categoryId,
      pricingModel: form.pricingModel,
      basePrice: Number(form.basePrice),
      durationHours: form.pricingModel === 'HOURLY' ? Number(form.durationHours) : undefined,
      unitLabel: form.unitLabel.trim() || undefined,
      minHours: form.pricingModel === 'HOURLY' ? Number(form.minHours) : undefined,
      description: form.description.trim() || undefined,
    });

    if (!parseResult.success) {
      const errMap: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const key = issue.path[0];
        if (key && typeof key === 'string') {
          errMap[key] = issue.message;
        }
      }
      setFormErrors(errMap);
      toast({
        type: 'warning',
        title: 'Dữ liệu chưa hợp lệ',
        message: 'Vui lòng kiểm tra lại thông tin báo lỗi trên form.',
      });
      return;
    }

    try {
      const cat = categories.find((c) => c.id === form.categoryId);
      const categoryName = cat ? cat.name : 'Dịch vụ chung';

      if (editingService) {
        // Update existing service
        await updateServiceMutation.mutateAsync({
          id: editingService.id,
          data: {
            name: form.name.trim(),
            categoryId: form.categoryId,
            categoryName,
            description: form.description.trim() || 'Dịch vụ chuyên nghiệp chất lượng cao',
            pricingModel: form.pricingModel,
            basePrice: Number(form.basePrice),
            unitLabel: form.unitLabel.trim() || undefined,
            durationHours: form.pricingModel === 'HOURLY' ? Number(form.durationHours) : undefined,
            minHours: form.pricingModel === 'HOURLY' ? Number(form.minHours) : undefined,
          },
        });
      } else {
        // Create new service
        const createdService = await createServiceMutation.mutateAsync({
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
          durationHours: form.pricingModel === 'HOURLY' ? Number(form.durationHours) : undefined,
          minHours: form.pricingModel === 'HOURLY' ? Number(form.minHours) : undefined,
          isActive: true,
          tenantId: isSuperAdmin ? undefined : currentTenantId,
          addons: [],
        });

        // Initial Add-on Creation: Automatically call createAddonMutation so it is not discarded
        if (form.addonName.trim() && createdService?.id) {
          try {
            await createAddonMutation.mutateAsync({
              serviceId: createdService.id,
              data: {
                name: form.addonName.trim(),
                price: Number(form.addonPrice),
                description: form.addonName.trim(),
              },
            });
          } catch (addonErr) {
            console.warn('Failed to auto-create initial addon:', addonErr);
          }
        }
      }

      setIsServiceModalOpen(false);
      setEditingService(null);
    } catch {
      // Handled in mutation onError
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

  const isSavingService =
    createServiceMutation.isPending ||
    updateServiceMutation.isPending ||
    createAddonMutation.isPending;

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

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setIsCategoryModalOpen(true)}
            leftIcon={<FolderTree className="w-4 h-4 text-brand-600" />}
          >
            Quản lý nhóm dịch vụ
          </Button>

          <Button
            variant="primary"
            onClick={handleOpenCreateService}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Thêm dịch vụ mới
          </Button>
        </div>
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
      {(isLoadingCategories || isLoadingServices) && services.length === 0 ? (
        <SkeletonCardGrid count={6} />
      ) : filteredServices.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-8 h-8 text-brand-400" />}
          title="Không tìm thấy dịch vụ nào"
          description="Hãy thử chọn danh mục khác hoặc bấm 'Thêm dịch vụ mới' để bắt đầu mở bán."
          action={
            <Button
              variant="secondary"
              onClick={handleOpenCreateService}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Thêm dịch vụ
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices
              .slice((currentPage - 1) * pageSize, currentPage * pageSize)
              .map((service) => {
                const isHourly = service.pricingModel === 'HOURLY';
                const isBidding = service.pricingModel === 'BIDDING';
                const addonCount = service.addons?.length || 0;
                const canModify = isSuperAdmin || (Boolean(service.tenantId) && service.tenantId === currentTenantId);

                return (
                  <Card
                    key={service.id}
                    className={`relative overflow-hidden transition-all duration-150 flex flex-col justify-between ${
                      service.isActive
                        ? 'border-slate-200'
                        : 'border-slate-200 bg-slate-50/70 opacity-80'
                    }`}
                  >
                    <div>
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
                          disabled={!canModify || toggleServiceMutation.isPending}
                          title={
                            !canModify
                              ? 'Chỉ Super Admin mới có quyền bật/tắt dịch vụ toàn sàn'
                              : service.isActive
                              ? 'Tạm ngừng dịch vụ'
                              : 'Kích hoạt dịch vụ'
                          }
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

                        {/* Add-ons Preview */}
                        {addonCount > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                              <Tag className="w-3 h-3 text-brand-500" />
                              Dịch vụ bán kèm (+{addonCount} Add-ons):
                            </span>
                            <div className="space-y-1 max-h-20 overflow-y-auto">
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
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-3 pt-2 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        {canModify ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditService(service)}
                            className="px-2.5 py-1 text-xs"
                            leftIcon={<Edit2 className="w-3.5 h-3.5 text-slate-600" />}
                          >
                            Chỉnh sửa
                          </Button>
                        ) : (
                          <Badge
                            variant="neutral"
                            size="sm"
                            className="px-2.5 py-1 text-xs font-medium text-slate-500 bg-slate-100"
                          >
                            Chỉ xem
                          </Badge>
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedServiceForAddons(service)}
                          className="px-2.5 py-1 text-xs font-semibold"
                          leftIcon={<Tag className="w-3.5 h-3.5" />}
                        >
                          <span>Quản lý phụ phí</span>
                          <Badge
                            variant="brand"
                            size="sm"
                            className="ml-1 px-1.5 py-0 text-[10px]"
                          >
                            {addonCount}
                          </Badge>
                        </Button>
                      </div>

                      {canModify && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteService(service)}
                          className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          title="Xóa dịch vụ"
                          disabled={deleteServiceMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredServices.length / pageSize)}
            totalItems={filteredServices.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Category Management Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Addons Management Modal */}
      <AddonModal
        service={
          // Keep live sync of selected service with updated addons array
          selectedServiceForAddons
            ? services.find((s) => s.id === selectedServiceForAddons.id) || selectedServiceForAddons
            : null
        }
        isOpen={!!selectedServiceForAddons}
        onClose={() => setSelectedServiceForAddons(null)}
        tenantId={currentTenantId}
      />

      {/* Create / Edit Service Modal */}
      <Modal
        isOpen={isServiceModalOpen}
        onClose={() => {
          setIsServiceModalOpen(false);
          setEditingService(null);
          setFormErrors({});
        }}
        title={editingService ? `Chỉnh Sửa Dịch Vụ: "${editingService.name}"` : 'Thêm Dịch Vụ Mới Vào Danh Mục'}
        subtitle={
          editingService
            ? 'Cập nhật đơn giá, cơ chế tính phí hoặc số giờ làm việc tối thiểu.'
            : 'Khởi tạo dịch vụ với giá kế thừa tự động từ nhóm ngành hoặc định giá tùy chỉnh.'
        }
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsServiceModalOpen(false);
                setEditingService(null);
                setFormErrors({});
              }}
              disabled={isSavingService}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveService}
              disabled={isSavingService}
              isLoading={isSavingService}
            >
              {editingService ? 'Lưu thay đổi' : 'Tạo & Bật Cung Cấp'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveService} className="space-y-4">
          <Input
            label="Tên dịch vụ *"
            placeholder="Ví dụ: Vệ sinh máy giặt lồng đứng"
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
            }}
            error={formErrors.name}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Select
                label="Nhóm ngành danh mục *"
                value={form.categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
              <span className="text-[11px] text-brand-600 block mt-1 font-medium">
                💡 Tự động kế thừa giá &amp; đơn vị từ cấu hình của nhóm ngành.
              </span>
            </div>

            <Select
              label="Phương thức định giá *"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Đơn giá cơ bản (VNĐ) *"
              type="number"
              value={form.basePrice}
              onChange={(e) => {
                setForm({ ...form, basePrice: Number(e.target.value) });
                if (formErrors.basePrice) setFormErrors({ ...formErrors, basePrice: '' });
              }}
              error={formErrors.basePrice}
              required
            />
            <Input
              label="Đơn vị tính"
              placeholder="giờ / máy / căn"
              value={form.unitLabel}
              onChange={(e) => setForm({ ...form, unitLabel: e.target.value })}
            />
          </div>

          {form.pricingModel === 'HOURLY' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Thời lượng ước tính (giờ) *"
                type="number"
                min={0.1}
                step={0.5}
                placeholder="Ví dụ: 2"
                value={form.durationHours}
                onChange={(e) => {
                  setForm({ ...form, durationHours: Number(e.target.value) });
                  if (formErrors.durationHours) setFormErrors({ ...formErrors, durationHours: '' });
                }}
                error={formErrors.durationHours}
                helperText="Thời lượng dự kiến hoàn thành (ví dụ: 2 giờ)"
              />
              <Input
                label="Số giờ tối thiểu (giờ) *"
                type="number"
                min={1}
                max={12}
                placeholder="Ví dụ: 2"
                value={form.minHours}
                onChange={(e) => {
                  setForm({ ...form, minHours: Number(e.target.value) });
                  if (formErrors.minHours) setFormErrors({ ...formErrors, minHours: '' });
                }}
                error={formErrors.minHours}
                helperText="Số giờ làm việc tối thiểu tính công (ví dụ: 2 giờ)"
              />
            </div>
          )}

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

          {!editingService && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                Dịch vụ bán kèm ban đầu (+Addon, tùy chọn):
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
          )}
        </form>
      </Modal>
    </div>
  );
};
