import React, { useState } from 'react';
import { Booking } from '../../../types';
import { Button } from '../../../components/common/Button';
import { CheckCircle2, Star, Check, X, Banknote } from 'lucide-react';

interface CompletionModalProps {
  isOpen: boolean;
  booking: Booking | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (rating: number, note: string) => Promise<void> | void;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  isOpen,
  booking,
  isSubmitting,
  onClose,
  onConfirm,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [note, setNote] = useState<string>('');
  const [collectedCash, setCollectedCash] = useState<boolean>(true);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalNote = note.trim()
      ? `${note.trim()}${collectedCash ? ' (Đã thu đủ tiền mặt)' : ''}`
      : (collectedCash ? 'Thợ đã thu đủ tiền mặt từ khách hàng' : 'Nghiệm thu hoàn thành đơn');
    await onConfirm(rating, finalNote);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              Nghiệm thu & Hoàn thành đơn
            </h3>
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
            <div>
              <span className="text-xs font-mono font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded">
                {booking.code}
              </span>
              <p className="text-sm font-semibold text-slate-800 mt-1">
                {booking.serviceName}
              </p>
              <p className="text-xs text-slate-500">
                Khách hàng: {booking.customerName} ({booking.customerPhone})
              </p>
              {booking.assignedTaskerName && (
                <p className="text-xs text-brand-700 font-medium mt-0.5">
                  Thợ phụ trách: {booking.assignedTaskerName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Đánh giá mức độ hài lòng
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-1.5 rounded-lg transition-transform hover:scale-110 ${
                      star <= rating ? 'text-amber-400' : 'text-slate-200'
                    }`}
                  >
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                ))}
                <span className="text-xs font-bold text-amber-600 ml-2">
                  {rating === 5
                    ? '5/5 - Xuất sắc'
                    : rating === 4
                    ? '4/5 - Hài lòng'
                    : rating === 3
                    ? '3/5 - Đạt chuẩn'
                    : rating === 2
                    ? '2/5 - Chưa đạt'
                    : '1/5 - Không hài lòng'}
                </span>
              </div>
            </div>

            {/* Khối thu tiền mặt & trích hoa hồng */}
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  Thanh toán Tiền mặt (CASH)
                </span>
                <span className="text-xs font-black text-emerald-700">
                  {booking.totalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="text-[11px] text-emerald-800 flex items-center justify-between pt-1 border-t border-emerald-200/60">
                <span>Dự toán hoa hồng sàn (15%):</span>
                <span className="font-semibold text-emerald-900">
                  -{Math.round(booking.totalAmount * 0.15).toLocaleString('vi-VN')} đ (trừ ví ký quỹ thợ)
                </span>
              </div>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={collectedCash}
                  onChange={(e) => setCollectedCash(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span className="text-[11px] text-slate-700 font-medium">
                  Xác nhận thợ đã thu đủ {booking.totalAmount.toLocaleString('vi-VN')} đ tiền mặt từ khách
                </span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Ghi chú nghiệm thu
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Nhập nhận xét nghiệm thu, biên bản bàn giao hoặc ghi chú đặc biệt..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
              disabled={isSubmitting}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              {isSubmitting ? 'Đang hoàn tất...' : 'Xác nhận hoàn thành'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
