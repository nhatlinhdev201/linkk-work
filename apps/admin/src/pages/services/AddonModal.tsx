import React, { useState } from 'react';
import type { ServiceItem, ServiceAddon } from '../../types';
import {
  useCreateAddonMutation,
  useUpdateAddonMutation,
  useDeleteAddonMutation,
} from '../../api/queries';
import { useConfirm } from '../../components/feedback/ConfirmContext';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Switch } from '../../components/common/Switch';
import { addonSchema } from '../../schemas/catalog.schema';
import { Tag, Plus, Trash2, Layers, Edit2, X, Check } from 'lucide-react';

export interface AddonModalProps {
  service: ServiceItem | null;
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string | null;
}

export const AddonModal: React.FC<AddonModalProps> = ({
  service,
  isOpen,
  onClose,
  tenantId,
}) => {
  const createAddonMutation = useCreateAddonMutation(tenantId);
  const updateAddonMutation = useUpdateAddonMutation(tenantId);
  const deleteAddonMutation = useDeleteAddonMutation(tenantId);
  const confirm = useConfirm();

  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(30000);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!service) return null;

  const handleStartEdit = (addon: ServiceAddon) => {
    setEditingAddonId(addon.id);
    setName(addon.name);
    setPrice(addon.price);
    setDescription(addon.description || '');
    setIsActive(addon.isActive !== false);
    setErrors({});
  };

  const handleCancelEdit = () => {
    setEditingAddonId(null);
    setName('');
    setPrice(30000);
    setDescription('');
    setIsActive(true);
    setErrors({});
  };

  const handleToggleAddonActive = async (addon: ServiceAddon, nextActive: boolean) => {
    try {
      await updateAddonMutation.mutateAsync({
        addonId: addon.id,
        data: { isActive: nextActive },
      });
    } catch {
      // Handled in mutation onError toast
    }
  };

  const handleSubmitAddon = async (e: React.FormEvent) => {
    e.preventDefault();

    const parseResult = addonSchema.safeParse({
      name: name.trim(),
      price: Number(price),
      description: description.trim() || undefined,
      isActive,
    });

    if (!parseResult.success) {
      const errMap: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const key = issue.path[0];
        if (key && typeof key === 'string') {
          errMap[key] = issue.message;
        }
      }
      setErrors(errMap);
      return;
    }

    try {
      if (editingAddonId) {
        await updateAddonMutation.mutateAsync({
          addonId: editingAddonId,
          data: {
            name: name.trim(),
            price: Number(price),
            description: description.trim() || undefined,
            isActive,
          },
        });
        handleCancelEdit();
      } else {
        await createAddonMutation.mutateAsync({
          serviceId: service.id,
          data: {
            name: name.trim(),
            price: Number(price),
            description: description.trim() || undefined,
          },
        });

        setName('');
        setPrice(30000);
        setDescription('');
        setIsActive(true);
        setErrors({});
      }
    } catch {
      // Handled in mutation onError toast
    }
  };

  const handleDeleteAddon = async (addon: ServiceAddon) => {
    const confirmed = await confirm({
      title: `Xóa phụ phí "${addon.name}"?`,
      message: (
        <span>
          Bạn có chắc chắn muốn xóa phụ thu bán kèm <strong>&quot;{addon.name}&quot;</strong> khỏi
          dịch vụ này?
        </span>
      ),
      variant: 'danger',
      confirmText: 'Xóa phụ phí',
      cancelText: 'Hủy bỏ',
    });

    if (!confirmed) return;

    try {
      await deleteAddonMutation.mutateAsync(addon.id);
      if (editingAddonId === addon.id) {
        handleCancelEdit();
      }
    } catch {
      // Handled in mutation onError toast
    }
  };

  const addons = service.addons || [];
  const isSubmitting = createAddonMutation.isPending || updateAddonMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleCancelEdit();
        onClose();
      }}
      title="Quản Lý Phụ Phí & Bán Kèm (+Add-ons)"
      subtitle={`Dịch vụ: "${service.name}" (${service.categoryName})`}
      maxWidth="lg"
      footer={
        <Button
          variant="outline"
          onClick={() => {
            handleCancelEdit();
            onClose();
          }}
        >
          Hoàn tất
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Existing Addons List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-brand-500" />
              Danh sách phụ thu hiện tại ({addons.length})
            </span>
          </div>

          {addons.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-2">
              <Layers className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">
                Chưa có phụ thu hoặc dịch vụ bán kèm nào cho dịch vụ này.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {addons.map((addon) => (
                <div
                  key={addon.id}
                  className={`flex items-center justify-between p-3 border rounded-xl text-xs transition ${
                    addon.isActive !== false
                      ? 'bg-slate-50/70 border-slate-200/90'
                      : 'bg-slate-100/60 border-slate-200 opacity-70'
                  }`}
                >
                  <div className="space-y-0.5 flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 truncate">{addon.name}</span>
                      {addon.isActive === false ? (
                        <Badge variant="neutral" size="sm">
                          Tạm tắt
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          Kích hoạt
                        </Badge>
                      )}
                    </div>
                    {addon.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {addon.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="font-bold text-brand-600 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-lg">
                      +{addon.price.toLocaleString('vi-VN')} đ
                    </span>

                    <Switch
                      checked={addon.isActive !== false}
                      onChange={(checked) => handleToggleAddonActive(addon, checked)}
                      disabled={updateAddonMutation.isPending}
                      title={addon.isActive !== false ? 'Tắt phụ phí' : 'Bật phụ phí'}
                    />

                    <button
                      type="button"
                      onClick={() => handleStartEdit(addon)}
                      disabled={updateAddonMutation.isPending || deleteAddonMutation.isPending}
                      className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition disabled:opacity-50"
                      title="Chỉnh sửa phụ phí"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteAddon(addon)}
                      disabled={deleteAddonMutation.isPending}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                      title="Xóa phụ phí"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New / Edit Addon Form */}
        <form
          onSubmit={handleSubmitAddon}
          className={`p-4 rounded-2xl space-y-3 transition border ${
            editingAddonId
              ? 'bg-blue-50/40 border-blue-200'
              : 'bg-orange-50/40 border-orange-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              {editingAddonId ? (
                <>
                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  Chỉnh sửa phụ phí: &quot;{name || 'Phụ phí'}&quot;
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-brand-600" />
                  Thêm phụ thu mới cho dịch vụ này
                </>
              )}
            </span>
            {editingAddonId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Hủy sửa
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Tên phụ thu / dụng cụ *"
              placeholder="Ví dụ: Giặt khử khuẩn nano bạc"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              error={errors.name}
              required
            />

            <Input
              label="Mức giá phụ thu (VNĐ) *"
              type="number"
              min={0}
              placeholder="30000"
              value={price}
              onChange={(e) => {
                setPrice(Number(e.target.value));
                if (errors.price) setErrors({ ...errors, price: '' });
              }}
              error={errors.price}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <Input
              label="Mô tả / ghi chú phụ thu (tùy chọn)"
              placeholder="Quy chuẩn dụng cụ, điều kiện áp dụng..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {editingAddonId && (
              <div className="pb-1.5 flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200">
                <span className="text-xs font-medium text-slate-700">Trạng thái kích hoạt:</span>
                <Switch
                  checked={isActive}
                  onChange={setIsActive}
                  title={isActive ? 'Đang kích hoạt' : 'Tạm tắt'}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            {editingAddonId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
              >
                Hủy bỏ
              </Button>
            )}
            <Button
              type="submit"
              variant={editingAddonId ? 'secondary' : 'primary'}
              size="sm"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              leftIcon={
                editingAddonId ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )
              }
            >
              {editingAddonId ? 'Cập nhật phụ phí' : 'Thêm phụ phí'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
