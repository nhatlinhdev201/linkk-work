import React, { useState, useEffect } from 'react';
import type { Tasker } from '../../types';
import { useAdjustDepositMutation } from '../../api/queries';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { depositSchema } from '../../schemas/tasker.schema';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  FileText,
  CheckCircle2,
} from 'lucide-react';

export interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasker: Tasker | null;
  onSuccess?: () => void;
}

const TOP_UP_PRESETS = [200000, 500000, 1000000, 2000000];
const DEDUCT_PRESETS = [50000, 100000, 200000, 500000];

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  tasker,
  onSuccess,
}) => {
  const adjustDepositMutation = useAdjustDepositMutation();

  const [direction, setDirection] = useState<'TOP_UP' | 'DEDUCT'>('TOP_UP');
  const [rawAmount, setRawAmount] = useState<number>(500000);
  const [notes, setNotes] = useState<string>('Nạp bổ sung ký quỹ hợp đồng');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tasker) {
      setDirection('TOP_UP');
      setRawAmount(500000);
      setNotes('Nạp bổ sung ký quỹ hợp đồng');
      setError(null);
    }
  }, [tasker, isOpen]);

  if (!tasker) return null;

  const currentBalance = tasker.depositBalance ?? 0;
  const deltaAmount = direction === 'TOP_UP' ? Math.abs(rawAmount) : -Math.abs(rawAmount);
  const projectedBalance = currentBalance + deltaAmount;
  const isNegativeProjected = projectedBalance < 0;

  const handleDirectionChange = (newDir: 'TOP_UP' | 'DEDUCT') => {
    setDirection(newDir);
    setError(null);
    if (newDir === 'TOP_UP') {
      setNotes('Nạp bổ sung ký quỹ hợp đồng');
      setRawAmount(500000);
    } else {
      setNotes('Khấu trừ phí vi phạm quy chế sàn');
      setRawAmount(100000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rawAmount <= 0) {
      setError('Số tiền điều chỉnh phải lớn hơn 0');
      return;
    }

    if (isNegativeProjected) {
      setError('Số dư ký quỹ sau điều chỉnh không thể âm');
      return;
    }

    const parsed = depositSchema.safeParse({
      amount: deltaAmount,
      notes: notes.trim(),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ');
      return;
    }

    try {
      await adjustDepositMutation.mutateAsync({
        id: tasker.id,
        data: parsed.data,
      });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Không thể thực hiện điều chỉnh ký quỹ'
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Điều chỉnh Số dư Ký quỹ Đảm bảo"
      subtitle={`Thợ: ${tasker.name} (${tasker.code || tasker.id}) • Ghi nhận vào Sổ cái kép`}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={adjustDepositMutation.isPending}
          >
            Hủy bỏ
          </Button>
          <Button
            variant={direction === 'TOP_UP' ? 'primary' : 'danger'}
            size="sm"
            onClick={handleSubmit}
            isLoading={adjustDepositMutation.isPending}
            disabled={isNegativeProjected || rawAmount <= 0}
            icon={
              direction === 'TOP_UP' ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownLeft className="w-4 h-4" />
              )
            }
          >
            {direction === 'TOP_UP' ? 'Xác nhận Nạp tiền ký quỹ' : 'Xác nhận Khấu trừ ký quỹ'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}

        {/* Current Balance Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">Số dư ký quỹ hiện tại</span>
              <span className="text-base font-bold text-slate-900">
                {currentBalance.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 text-xs font-bold rounded-xl border ${
              currentBalance >= 100000
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {currentBalance >= 100000 ? 'An toàn' : 'Cảnh báo nợ cọc'}
          </span>
        </div>

        {/* Direction Switch */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Loại giao dịch nghiệp vụ
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDirectionChange('TOP_UP')}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                direction === 'TOP_UP'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              Nạp tiền ký quỹ (+)
            </button>
            <button
              type="button"
              onClick={() => handleDirectionChange('DEDUCT')}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                direction === 'DEDUCT'
                  ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-rose-600" />
              Khấu trừ ký quỹ (-)
            </button>
          </div>
        </div>

        {/* Amount Input & Presets */}
        <div className="space-y-2">
          <Input
            label="Số tiền điều chỉnh (VNĐ)"
            type="number"
            step="1000"
            min="1000"
            required
            value={rawAmount}
            onChange={(e) => setRawAmount(Math.max(0, Number(e.target.value)))}
            placeholder="500000"
            helperText={`Đọc số: ${rawAmount.toLocaleString('vi-VN')} Việt Nam Đồng`}
          />

          <div className="flex flex-wrap gap-1.5 pt-1">
            {(direction === 'TOP_UP' ? TOP_UP_PRESETS : DEDUCT_PRESETS).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setRawAmount(preset)}
                className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition cursor-pointer ${
                  rawAmount === preset
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {direction === 'TOP_UP' ? '+' : '-'}
                {(preset / 1000).toLocaleString('vi-VN')}k đ
              </button>
            ))}
          </div>
        </div>

        {/* Notes input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Lý do ghi nhận vào Sổ cái <span className="text-rose-500 font-bold">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập lý do chi tiết..."
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Projected Balance Preview Box */}
        <div
          className={`rounded-2xl p-3.5 border transition-all text-xs ${
            isNegativeProjected
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center justify-between font-medium">
            <span>Số dư dự kiến sau giao dịch:</span>
            <span
              className={`text-sm font-bold ${
                isNegativeProjected
                  ? 'text-rose-700'
                  : projectedBalance >= 100000
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {projectedBalance.toLocaleString('vi-VN')} đ
            </span>
          </div>

          {isNegativeProjected ? (
            <p className="text-[11px] text-rose-700 mt-1 flex items-center gap-1 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Giao dịch bị chặn: Số dư sau khấu trừ không thể nhỏ hơn 0 đ.
            </p>
          ) : projectedBalance < 100000 ? (
            <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Lưu ý: Số dư mới dưới 100.000 đ sẽ kích hoạt cảnh báo nợ cọc.
            </p>
          ) : (
            <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Số dư đảm bảo trên ngưỡng an toàn (&gt;= 100.000 đ).
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
};
