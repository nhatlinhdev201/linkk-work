import React, { useState } from 'react';
import type { ServiceItem, ServiceAddon } from '../../types';
import {
  useCreateAddonMutation,
  useDeleteAddonMutation,
} from '../../api/queries';
import { useConfirm } from '../../components/feedback/ConfirmContext';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { addonSchema } from '../../schemas/catalog.schema';
import { Tag, Plus, Trash2, Layers } from 'lucide-react';

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
  const deleteAddonMutation = useDeleteAddonMutation(tenantId);
  const confirm = useConfirm();

  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(30000);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!service) return null;

  const handleAddAddon = async (e: React.FormEvent) => {
    e.preventDefault();

    const parseResult = addonSchema.safeParse({
      name: name.trim(),
      price: Number(price),
      description: description.trim() || undefined,
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
      setErrors({});
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
    } catch {
      // Handled in mutation onError toast
    }
  };

  const addons = service.addons || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quản Lý Phụ Phí & Bán Kèm (+Add-ons)"
      subtitle={`Dịch vụ: "${service.name}" (${service.categoryName})`}
      maxWidth="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
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
                  className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-200/90 rounded-xl text-xs"
                >
                  <div className="space-y-0.5 flex-1 min-w-0 pr-3">
                    <div className="font-semibold text-slate-900 truncate">{addon.name}</div>
                    {addon.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {addon.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-brand-600 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-lg">
                      +{addon.price.toLocaleString('vi-VN')} đ
                    </span>
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

        {/* Add New Addon Form */}
        <form
          onSubmit={handleAddAddon}
          className="p-4 bg-orange-50/40 border border-orange-100 rounded-2xl space-y-3"
        >
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-brand-600" />
            Thêm phụ thu mới cho dịch vụ này
          </span>

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

          <Input
            label="Mô tả / ghi chú phụ thu (tùy chọn)"
            placeholder="Quy chuẩn dụng cụ, điều kiện áp dụng..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createAddonMutation.isPending}
              isLoading={createAddonMutation.isPending}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Thêm phụ phí
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
