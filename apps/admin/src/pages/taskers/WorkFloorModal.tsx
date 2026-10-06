import React, { useState, useEffect } from 'react';
import type { Tasker } from '../../types';
import { useUpdateWorkFloorMutation } from '../../api/queries';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Switch } from '../../components/common/Switch';
import { workFloorSchema } from '../../schemas/tasker.schema';
import {
  Compass,
  Radio,
  Power,
  Navigation,
  MapPin,
} from 'lucide-react';

export interface WorkFloorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasker: Tasker | null;
  onSuccess?: () => void;
}

export const WorkFloorModal: React.FC<WorkFloorModalProps> = ({
  isOpen,
  onClose,
  tasker,
  onSuccess,
}) => {
  const updateWorkFloorMutation = useUpdateWorkFloorMutation();

  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(15);
  const [autoRadarEnabled, setAutoRadarEnabled] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tasker) {
      setMaxDistanceKm(tasker.maxDistanceKm ?? 15);
      setAutoRadarEnabled(tasker.autoRadarEnabled ?? true);
      setIsOnline(tasker.isOnline ?? false);
      setError(null);
    }
  }, [tasker, isOpen]);

  if (!tasker) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = workFloorSchema.safeParse({
      maxDistanceKm: Number(maxDistanceKm),
      autoRadarEnabled,
      isOnline,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ');
      return;
    }

    try {
      await updateWorkFloorMutation.mutateAsync({
        id: tasker.id,
        data: parsed.data,
      });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Không thể cập nhật cấu hình sàn làm việc'
      );
    }
  };

  const isLowDeposit = (tasker.depositBalance ?? 0) < 100000;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cấu hình Sàn làm việc &amp; Radar"
      subtitle={`Thợ: ${tasker.name} (${tasker.code || tasker.id}) • Bán kính & ca trực tuyến`}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={updateWorkFloorMutation.isPending}
          >
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={updateWorkFloorMutation.isPending}
            icon={<Compass className="w-4 h-4" />}
          >
            Lưu cấu hình sàn
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}

        {isLowDeposit && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <span className="font-bold text-amber-600 text-sm">⚠️</span>
            <div>
              <p className="font-semibold">Thợ đang có số dư ký quỹ dưới 100.000 đ</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Mặc dù có thể cấu hình bán kính quét việc, hệ thống điều phối sẽ tự động bỏ qua thợ này trong hàng đợi gán đơn tự động cho đến khi ký quỹ được bổ sung.
              </p>
            </div>
          </div>
        )}

        {/* Setting 1: Bán kính phục vụ */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-brand-600" />
              Bán kính phục vụ tối đa (km)
            </label>
            <span className="text-sm font-bold text-brand-600 px-2.5 py-0.5 bg-brand-50 border border-brand-200 rounded-lg">
              {maxDistanceKm} km
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="50"
            step="1"
            value={maxDistanceKm}
            onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
            className="w-full accent-brand-500 cursor-pointer"
          />

          <div className="flex justify-between text-[11px] text-slate-400 font-medium">
            <span>1 km (Gần)</span>
            <span>15 km (Tiêu chuẩn)</span>
            <span>30 km</span>
            <span>50 km (Rộng)</span>
          </div>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Thợ chỉ nhận các yêu cầu dịch vụ có địa chỉ trong phạm vi {maxDistanceKm} km quanh vị trí trực.</span>
          </div>
        </div>

        {/* Setting 2: Tự động nhận đơn radar */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <Switch
            checked={autoRadarEnabled}
            onChange={setAutoRadarEnabled}
            label="Chế độ Radar tự động"
            description="Tự động bắt tín hiệu và xếp đơn hàng phù hợp vào hàng đợi của thợ theo kỹ năng và bán kính"
          />
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
            <Radio className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <span>
              Trạng thái:{' '}
              <strong className={autoRadarEnabled ? 'text-emerald-700' : 'text-slate-600'}>
                {autoRadarEnabled ? 'Đang kích hoạt nhận đơn tự động' : 'Tắt radar (Chỉ nhận đơn chỉ định tay)'}
              </strong>
            </span>
          </div>
        </div>

        {/* Setting 3: Trạng thái ca trực tuyến */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <Switch
            checked={isOnline}
            onChange={setIsOnline}
            label="Trạng thái ca trực (Online/Offline)"
            description="Bật trực tuyến để thợ xuất hiện trên bản đồ điều phối thời gian thực và sẵn sàng xuất phát"
          />
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[11px]">
            <Power className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="text-slate-500">
              Hiện tại:{' '}
              <strong className={isOnline ? 'text-emerald-700' : 'text-slate-600'}>
                {isOnline ? 'Trực tuyến (ONLINE)' : 'Ngoại tuyến (OFFLINE)'}
              </strong>
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
};
