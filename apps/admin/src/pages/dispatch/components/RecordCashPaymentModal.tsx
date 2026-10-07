import React, { useState, useEffect } from 'react';
import { Booking } from '../../../types';
import { Button } from '../../../components/common/Button';
import { Banknote, Check, X, ShieldAlert } from 'lucide-react';

interface RecordCashPaymentModalProps {
  isOpen: boolean;
  booking: Booking | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (amount: number, note: string, deductCommission: boolean) => Promise<void> | void;
}

export const RecordCashPaymentModal: React.FC<RecordCashPaymentModalProps> = ({
  isOpen,
  booking,
  isSubmitting,
  onClose,
  onConfirm,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [deductCommission, setDeductCommission] = useState<boolean>(true);

  useEffect(() => {
    if (booking) {
      setAmount(booking.totalAmount);
      setNote(`Thợ ${booking.assignedTaskerName || 'phụ trách'} đã thu đủ tiền mặt từ khách hàng`);
      setDeductCommission(Boolean(booking.assignedTaskerId));
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const commissionRate = 15; // 15% standard tenant commission
  const commissionAmount = Math.round(amount * (commissionRate / 100));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(amount, note, deductCommission);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ghi nhận thu tiền mặt
              </h3>
              <p className="text-xs text-slate-500">
                Xác nhận khách đã thanh toán cho thợ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            {/* Booking Summary */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold bg-white text-brand-700 px-2 py-0.5 rounded border border-brand-200">
                  {booking.code}
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {booking.totalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800">
                {booking.serviceName}
              </p>
              <p className="text-[11px] text-slate-500">
                Khách: {booking.customerName} ({booking.customerPhone})
              </p>
              {booking.assignedTaskerName ? (
                <p className="text-[11px] text-emerald-700 font-medium">
                  Thợ thu tiền: {booking.assignedTaskerName} ({booking.assignedTaskerPhone})
                </p>
              ) : (
                <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Chưa gán thợ: Đơn sẽ chỉ ghi nhận thanh toán, không trừ ví thợ
                </p>
              )}
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Số tiền mặt thực thu (VND) *
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                className="w-full text-sm font-bold p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Commission calculation */}
            {booking.assignedTaskerId && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                  <span>Hoa hồng sàn LinkkWork ({commissionRate}%):</span>
                  <span className="font-bold text-emerald-700">
                    -{commissionAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-emerald-200/60">
                  <input
                    type="checkbox"
                    checked={deductCommission}
                    onChange={(e) => setDeductCommission(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Tự động khấu trừ {commissionAmount.toLocaleString('vi-VN')} đ từ Ví ký quỹ của Thợ
                  </span>
                </label>
              </div>
            )}

            {/* Note input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Ghi chú thu tiền
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Nhập ghi chú thu tiền mặt..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isSubmitting || amount <= 0}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              {isSubmitting ? 'Đang ghi nhận...' : 'Xác nhận đã thu tiền'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
