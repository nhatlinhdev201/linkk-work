import React from 'react';
import { Booking } from '../../../types';
import { Button } from '../../../components/common/Button';
import { Banknote, CheckCircle2, Clock, ArrowDownRight, User, AlertCircle } from 'lucide-react';

interface PaymentLedgerCardProps {
  booking: Booking;
  onRecordPaymentClick?: () => void;
  canRecordPayment?: boolean;
}

export const PaymentLedgerCard: React.FC<PaymentLedgerCardProps> = ({
  booking,
  onRecordPaymentClick,
  canRecordPayment = true,
}) => {
  const isPaid = booking.paymentStatus === 'RELEASED_TO_TASKER';
  const transactions = booking.walletTransactions || [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
      {/* Header */}
      <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-bold text-slate-800">
            Thanh toán & Sổ cái Đơn hàng
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {isPaid ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3 h-3" />
              Đã thu tiền mặt
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
              <Clock className="w-3 h-3" />
              Chờ thu tiền mặt
            </span>
          )}
        </div>
      </div>

      {/* Payment details summary */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Hình thức:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              Tiền mặt (CASH)
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Tổng cước thu từ khách:</span>
            <span className="font-black text-brand-700 text-sm mt-0.5 block">
              {booking.totalAmount.toLocaleString('vi-VN')} đ
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Thời gian xác nhận:</span>
            <span className="font-semibold text-slate-700 mt-0.5 block">
              {booking.paidAt
                ? new Date(booking.paidAt).toLocaleString('vi-VN')
                : 'Chưa thanh toán'}
            </span>
          </div>
        </div>

        {/* If not paid and can record payment */}
        {!isPaid && !['DRAFT', 'CANCELLED'].includes(booking.status) && canRecordPayment && onRecordPaymentClick && (
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center justify-between gap-3">
            <div className="text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Đơn chưa ghi nhận thanh toán tiền mặt. Vui lòng xác nhận khi thợ đã thu đủ tiền từ khách.
              </span>
            </div>
            <Button
              size="sm"
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 text-xs"
              onClick={onRecordPaymentClick}
              leftIcon={<Banknote className="w-3.5 h-3.5" />}
            >
              Thu tiền mặt ngay
            </Button>
          </div>
        )}

        {/* Ledger Transactions list if any */}
        {transactions.length > 0 && (
          <div className="space-y-2 pt-1">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Giao dịch Sổ cái Ký quỹ liên quan ({transactions.length})
            </h5>
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-xl border border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-700 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                        {tx.code}
                      </span>
                      <span className="font-semibold text-rose-600 flex items-center gap-1">
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                        Khấu trừ hoa hồng sàn (15%)
                      </span>
                    </div>
                    {tx.notes && (
                      <p className="text-[11px] text-slate-500 truncate max-w-md">
                        {tx.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-rose-600 text-xs block">
                      -{tx.amount.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Số dư ví thợ: {tx.balanceBefore?.toLocaleString('vi-VN')} → {tx.balanceAfter?.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
