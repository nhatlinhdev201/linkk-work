import React from 'react';
import type { Tasker } from '../../types';
import {
  AlertTriangle,
  ShieldAlert,
  Star,
  X,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export interface HRMAlertsBannerProps {
  taskers: Tasker[];
  activeFilter?: string;
  onFilterLowDeposit: () => void;
  onFilterPendingKyc: () => void;
  onFilterLowRating: () => void;
  onClearFilter: () => void;
}

export const HRMAlertsBanner: React.FC<HRMAlertsBannerProps> = ({
  taskers,
  activeFilter,
  onFilterLowDeposit,
  onFilterPendingKyc,
  onFilterLowRating,
  onClearFilter,
}) => {
  const lowDepositCount = taskers.filter(
    (t) => (t.depositBalance ?? 0) < 100000
  ).length;

  const pendingKycCount = taskers.filter((t) => !t.kycVerified).length;

  const lowRatingCount = taskers.filter(
    (t) => (t.ratingScore || t.rating || 5.0) < 4.0
  ).length;

  const totalAlerts = lowDepositCount + pendingKycCount + lowRatingCount;

  if (totalAlerts === 0) {
    return (
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-900">
              Đội ngũ nhân sự đang ở trạng thái tối ưu
            </h4>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              100% thợ đã hoàn tất xác thực KYC, số dư ký quỹ đảm bảo trên ngưỡng 100.000 đ và duy trì đánh giá tốt.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-xs relative overflow-hidden transition-all">
      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-500" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        {/* Left info */}
        <div className="flex items-start sm:items-center gap-3 pl-1">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5 sm:mt-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-slate-900">
                Cảnh báo Nhân sự &amp; Vận hành ({totalAlerts} vấn đề cần chú ý)
              </h4>
              {activeFilter && activeFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                  Đang lọc cảnh báo
                  <button
                    onClick={onClearFilter}
                    className="hover:text-brand-900 ml-0.5 cursor-pointer"
                    title="Xóa lọc cảnh báo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Thợ nợ cọc dưới 100k sẽ bị hệ thống tự động loại khỏi radar nhận việc tự động để phòng ngừa rủi ro.
            </p>
          </div>
        </div>

        {/* Right filter chips */}
        <div className="flex flex-wrap items-center gap-2 pl-1 sm:pl-0">
          {/* Chip 1: Low Deposit */}
          {lowDepositCount > 0 && (
            <button
              onClick={onFilterLowDeposit}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === 'LOW_DEPOSIT'
                  ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-500/30'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{lowDepositCount} nợ cọc (&lt; 100k)</span>
              <ArrowRight className="w-3 h-3 ml-0.5 opacity-70" />
            </button>
          )}

          {/* Chip 2: KYC Pending */}
          {pendingKycCount > 0 && (
            <button
              onClick={onFilterPendingKyc}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === 'PENDING_KYC'
                  ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-500/30'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{pendingKycCount} chờ duyệt KYC</span>
              <ArrowRight className="w-3 h-3 ml-0.5 opacity-70" />
            </button>
          )}

          {/* Chip 3: Low Rating */}
          {lowRatingCount > 0 && (
            <button
              onClick={onFilterLowRating}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === 'LOW_RATING'
                  ? 'bg-orange-600 text-white shadow-xs ring-2 ring-orange-500/30'
                  : 'bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200'
              }`}
            >
              <Star className="w-3.5 h-3.5 shrink-0" />
              <span>{lowRatingCount} sao thấp (&lt; 4.0★)</span>
              <ArrowRight className="w-3 h-3 ml-0.5 opacity-70" />
            </button>
          )}

          {/* Reset filter if an alert filter is active */}
          {activeFilter && ['LOW_DEPOSIT', 'PENDING_KYC', 'LOW_RATING'].includes(activeFilter) && (
            <button
              onClick={onClearFilter}
              type="button"
              className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 underline cursor-pointer"
            >
              Xem tất cả
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
