import React, { useState } from 'react';
import { Booking } from '../../../types';
import { Button } from '../../../components/common/Button';
import { XCircle, AlertTriangle, X } from 'lucide-react';

interface CancelBookingModalProps {
  isOpen: boolean;
  booking: Booking | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string, detailNote?: string) => Promise<void> | void;
}

const PRESET_CANCEL_REASONS = [
  'Khách hàng yêu cầu hủy hẹn / đổi kế hoạch',
  'Không thể liên lạc được với khách hàng sau nhiều lần gọi',
  'Thợ gặp sự cố đột xuất (sức khỏe / phương tiện)',
  'Sai lệch thông tin dịch vụ hoặc ngoài phạm vi phục vụ',
  'Thời tiết xấu / sự cố bất khả kháng',
  'Lý do khác',
];

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  isOpen,
  booking,
  isSubmitting,
  onClose,
  onConfirm,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_CANCEL_REASONS[0]);
  const [detailNote, setDetailNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReason === 'Lý do khác' && !detailNote.trim()) {
      setErrorMessage('Vui lòng nhập chi tiết lý do hủy đơn khi chọn "Lý do khác"');
      return;
    }
    setErrorMessage('');
    const fullReason =
      selectedReason === 'Lý do khác'
        ? detailNote.trim()
        : detailNote.trim()
        ? `${selectedReason}: ${detailNote.trim()}`
        : selectedReason;

    await onConfirm(fullReason, detailNote.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-100 overflow-hidden animate-scaleIn">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2 text-rose-600">
            <XCircle className="w-5 h-5 shrink-0" />
            <h3 className="text-base font-bold text-slate-900">
              Xác nhận Hủy Đơn hàng
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
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Lưu ý quan trọng:</strong> Hành động này sẽ chuyển trạng thái đơn hàng sang{' '}
                <strong className="text-rose-700">CANCELLED</strong> và dừng toàn bộ tiến trình điều phối.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Lý do hủy đơn <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-1.5">
                {PRESET_CANCEL_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                      selectedReason === reason
                        ? 'border-rose-400 bg-rose-50/60 font-semibold text-slate-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => {
                        setSelectedReason(reason);
                        setErrorMessage('');
                      }}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Chi tiết bổ sung {selectedReason === 'Lý do khác' && <span className="text-rose-500">*</span>}
              </label>
              <textarea
                value={detailNote}
                onChange={(e) => {
                  setDetailNote(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                rows={3}
                placeholder={
                  selectedReason === 'Lý do khác'
                    ? 'Nhập chi tiết nguyên nhân hủy đơn...'
                    : 'Ghi chú thêm về cuộc gọi khách hàng hoặc thỏa thuận hủy...'
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
              {errorMessage && (
                <p className="text-xs text-rose-600 font-semibold mt-1">{errorMessage}</p>
              )}
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
              Quay lại
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={isSubmitting}
              leftIcon={<XCircle className="w-3.5 h-3.5" />}
            >
              {isSubmitting ? 'Đang hủy...' : 'Xác nhận hủy đơn'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
