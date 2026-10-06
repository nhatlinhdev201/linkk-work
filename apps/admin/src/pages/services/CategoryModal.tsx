import React, { useState } from 'react';
import type { ServiceCategory, PricingModel } from '../../types';
import {
  useServiceCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from '../../api/queries';
import { useConfirm } from '../../components/feedback/ConfirmContext';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Switch } from '../../components/common/Switch';
import { categorySchema } from '../../schemas/catalog.schema';
import { useAuth } from '../../auth/AuthContext';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Sparkles,
  Layers,
} from 'lucide-react';

export interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSuperAdmin?: boolean;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  isSuperAdmin: isSuperAdminProp,
}) => {
  const auth = useAuth();
  const isSuperAdmin = isSuperAdminProp !== undefined ? isSuperAdminProp : auth.isSuperAdmin;
  const { data: categories = [], isLoading } = useServiceCategoriesQuery(true);
  const createMutation = useCreateCategoryMutation();
  const updateMutation = useUpdateCategoryMutation();
  const deleteMutation = useDeleteCategoryMutation();
  const confirm = useConfirm();

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    icon: 'Sparkles',
    description: '',
    defaultPricingType: 'HOURLY' as PricingModel,
    defaultBasePrice: 80000,
    defaultUnitLabel: 'giờ',
    displayOrder: 1,
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      name: '',
      slug: '',
      icon: 'Sparkles',
      description: '',
      defaultPricingType: 'HOURLY',
      defaultBasePrice: 80000,
      defaultUnitLabel: 'giờ',
      displayOrder: categories.length + 1,
      isActive: true,
    });
    setFormErrors({});
    setMode('create');
  };

  const handleOpenEdit = (cat: ServiceCategory) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug || '',
      icon: cat.iconName || 'Sparkles',
      description: cat.description || '',
      defaultPricingType: cat.defaultPricingType || 'HOURLY',
      defaultBasePrice: cat.defaultBasePrice ?? 80000,
      defaultUnitLabel: cat.defaultUnitLabel || 'giờ',
      displayOrder: cat.displayOrder ?? 0,
      isActive: cat.isActive !== false,
    });
    setFormErrors({});
    setMode('edit');
  };

  const handleDelete = async (cat: ServiceCategory) => {
    const confirmed = await confirm({
      title: `Xóa nhóm danh mục "${cat.name}"?`,
      message: (
        <span>
          Bạn có chắc chắn muốn xóa nhóm danh mục <strong>&quot;{cat.name}&quot;</strong>?
          Lưu ý: Chỉ có thể xóa khi không còn dịch vụ nào trực thuộc nhóm này.
        </span>
      ),
      variant: 'danger',
      confirmText: 'Xóa nhóm',
      cancelText: 'Hủy bỏ',
    });

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(cat.id);
    } catch {
      // Handled in mutation onError toast
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const parseResult = categorySchema.safeParse({
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      icon: form.icon.trim() || undefined,
      description: form.description.trim() || undefined,
      defaultPricingType: form.defaultPricingType,
      defaultBasePrice: Number(form.defaultBasePrice),
      defaultUnitLabel: form.defaultUnitLabel.trim() || undefined,
      displayOrder: Number(form.displayOrder),
      isActive: form.isActive,
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
      return;
    }

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          name: form.name.trim(),
          slug: form.slug.trim() || undefined,
          icon: form.icon.trim() || undefined,
          description: form.description.trim() || undefined,
          defaultPricingType: form.defaultPricingType,
          defaultBasePrice: Number(form.defaultBasePrice),
          defaultUnitLabel: form.defaultUnitLabel.trim() || undefined,
          displayOrder: Number(form.displayOrder),
        });
      } else if (mode === 'edit' && editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          data: {
            name: form.name.trim(),
            slug: form.slug.trim() || undefined,
            iconName: form.icon.trim() || undefined,
            description: form.description.trim() || undefined,
            defaultPricingType: form.defaultPricingType,
            defaultBasePrice: Number(form.defaultBasePrice),
            defaultUnitLabel: form.defaultUnitLabel.trim() || undefined,
            displayOrder: Number(form.displayOrder),
            isActive: form.isActive,
          },
        });
      }
      setMode('list');
      setEditingId(null);
    } catch {
      // Handled in mutation onError toast
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setMode('list');
        setEditingId(null);
      }}
      title={
        mode === 'list'
          ? 'Quản Lý Nhóm Ngành Danh Mục'
          : mode === 'create'
          ? 'Thêm Nhóm Danh Mục Mới'
          : 'Chỉnh Sửa Nhóm Danh Mục'
      }
      subtitle={
        mode === 'list'
          ? isSuperAdmin
            ? 'Cấu hình nhóm ngành cùng cơ chế định giá & đơn giá mặc định áp dụng cho dịch vụ con.'
            : 'Chế độ chỉ xem — Chỉ Quản trị viên Toàn sàn (Super Admin) mới có quyền tạo mới, chỉnh sửa hoặc xóa nhóm danh mục.'
          : undefined
      }
      maxWidth="lg"
      footer={
        mode === 'list' ? (
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        ) : (
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => {
                setMode('list');
                setEditingId(null);
                setFormErrors({});
              }}
              disabled={isSaving}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Quay lại danh sách
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitForm}
              disabled={isSaving}
              isLoading={isSaving}
            >
              {mode === 'create' ? 'Tạo nhóm danh mục' : 'Lưu thay đổi'}
            </Button>
          </div>
        )
      }
    >
      {mode === 'list' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="text-xs text-slate-500">
              Tổng số:{' '}
              <span className="font-bold text-slate-800">{categories.length}</span> nhóm danh mục
              {!isSuperAdmin && (
                <span className="ml-2 font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[11px]">
                  Chỉ xem
                </span>
              )}
            </div>
            {isSuperAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenCreate}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Thêm nhóm mới
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Đang tải danh mục...
            </div>
          ) : categories.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Chưa có nhóm danh mục nào trong hệ thống.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between gap-3 transition"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm truncate">
                        {cat.name}
                      </span>
                      {cat.isActive === false ? (
                        <Badge variant="neutral" size="sm">
                          Tạm ẩn
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          Hoạt động
                        </Badge>
                      )}
                    </div>
                    {cat.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{cat.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        Giá mặc định:
                        <strong className="text-brand-600 font-bold">
                          {cat.defaultPricingType === 'BIDDING'
                            ? 'Đấu thầu'
                            : `${(cat.defaultBasePrice ?? 0).toLocaleString('vi-VN')} đ / ${
                                cat.defaultUnitLabel || 'lần'
                              }`}
                        </strong>
                      </span>
                      <span className="text-slate-400">|</span>
                      <span>Thứ tự: {cat.displayOrder ?? 0}</span>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-400 truncate max-w-[120px]">
                        Slug: {cat.slug}
                      </span>
                    </div>
                  </div>

                  {isSuperAdmin ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(cat)}
                        className="px-2.5 py-1 text-xs"
                        leftIcon={<Edit2 className="w-3.5 h-3.5 text-slate-600" />}
                      >
                        Sửa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(cat)}
                        className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                        disabled={deleteMutation.isPending}
                      >
                        Xóa
                      </Button>
                    </div>
                  ) : (
                    <div className="shrink-0">
                      <Badge variant="neutral" size="sm" className="text-slate-400">
                        Chỉ xem
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <Input
            label="Tên nhóm danh mục *"
            placeholder="Ví dụ: Dọn dẹp vệ sinh"
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
            }}
            error={formErrors.name}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Đường dẫn tĩnh (Slug)"
              placeholder="don-dep-ve-sinh (tùy chọn)"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
            <Input
              label="Biểu tượng (Icon)"
              placeholder="Sparkles / Wrench / Shirt"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Mô tả nhóm</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Mô tả phạm vi các dịch vụ thuộc nhóm này..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Pricing configuration section */}
          <div className="p-3.5 bg-brand-50/40 border border-brand-100 rounded-xl space-y-3">
            <span className="text-xs font-bold text-brand-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-500" />
              Cấu hình giá mặc định (Smart Pricing Defaults)
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Các giá trị này sẽ tự động gợi ý/điền sẵn khi tạo dịch vụ mới thuộc nhóm này, giúp
              chuẩn hóa bảng giá trên toàn nền tảng.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Phương thức mặc định"
                value={form.defaultPricingType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    defaultPricingType: e.target.value as PricingModel,
                  })
                }
                options={[
                  { value: 'HOURLY', label: 'Theo giờ (Hourly)' },
                  { value: 'PER_UNIT', label: 'Theo đơn vị (Per-unit)' },
                  { value: 'BIDDING', label: 'Báo giá (Bidding)' },
                ]}
              />

              <Input
                label="Đơn giá cơ bản mặc định"
                type="number"
                value={form.defaultBasePrice}
                onChange={(e) =>
                  setForm({ ...form, defaultBasePrice: Number(e.target.value) })
                }
                error={formErrors.defaultBasePrice}
              />

              <Input
                label="Đơn vị tính mặc định"
                placeholder="giờ / cái / phòng"
                value={form.defaultUnitLabel}
                onChange={(e) => setForm({ ...form, defaultUnitLabel: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <Input
              label="Thứ tự hiển thị"
              type="number"
              min={0}
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
            />

            <div className="flex items-center justify-between sm:justify-start gap-3 sm:pt-4">
              <span className="text-xs font-semibold text-slate-700">Trạng thái hoạt động:</span>
              <Switch
                checked={form.isActive}
                onChange={(checked) => setForm({ ...form, isActive: checked })}
              />
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
