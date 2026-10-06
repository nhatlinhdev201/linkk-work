import React from 'react';
import { BookingStatus } from '../../../types';
import { Badge, BadgeVariant } from '../../../components/common/Badge';
import {
  UserCheck,
  Truck,
  Wrench,
  Clock,
  CheckCircle2,
  Check,
  SlidersHorizontal,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface DispatchStepperProps {
  status: BookingStatus;
}

const LIFECYCLE_STEPS: Array<{
  key: BookingStatus;
  stepNum: number;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: 'ASSIGNED', stepNum: 1, label: 'Đã gán thợ', icon: <UserCheck className="w-4 h-4" /> },
  { key: 'ARRIVING', stepNum: 2, label: 'Đang di chuyển', icon: <Truck className="w-4 h-4" /> },
  { key: 'IN_PROGRESS', stepNum: 3, label: 'Đang thực hiện', icon: <Wrench className="w-4 h-4" /> },
  { key: 'PENDING_ACCEPTANCE', stepNum: 4, label: 'Chờ nghiệm thu', icon: <Clock className="w-4 h-4" /> },
  { key: 'COMPLETED', stepNum: 5, label: 'Hoàn thành', icon: <CheckCircle2 className="w-4 h-4" /> },
];

export const getStepNumber = (status: BookingStatus): number => {
  switch (status) {
    case 'ASSIGNED':
      return 1;
    case 'ARRIVING':
    case 'ON_THE_WAY':
      return 2;
    case 'IN_PROGRESS':
      return 3;
    case 'PENDING_ACCEPTANCE':
      return 4;
    case 'COMPLETED':
    case 'REVIEWED':
      return 5;
    default:
      return 0;
  }
};

export const getStatusBadgeInfo = (status: BookingStatus): { variant: BadgeVariant; label: string } => {
  switch (status) {
    case 'PENDING_DISPATCH':
      return { variant: 'warning', label: 'Chờ điều phối' };
    case 'BROADCASTING':
      return { variant: 'info', label: 'Đang phát sóng' };
    case 'MATCHING':
      return { variant: 'info', label: 'Đang ghép thợ' };
    case 'ASSIGNED':
      return { variant: 'brand', label: 'Đã gán thợ' };
    case 'ARRIVING':
    case 'ON_THE_WAY':
      return { variant: 'info', label: 'Đang di chuyển' };
    case 'IN_PROGRESS':
      return { variant: 'brand', label: 'Đang thực hiện' };
    case 'PENDING_ACCEPTANCE':
      return { variant: 'warning', label: 'Chờ nghiệm thu' };
    case 'COMPLETED':
      return { variant: 'success', label: 'Hoàn thành' };
    case 'CANCELLED':
      return { variant: 'danger', label: 'Đã hủy' };
    case 'EMERGENCY_REDISPATCH':
      return { variant: 'warning', label: 'Điều phối lại' };
    case 'REVIEWED':
      return { variant: 'success', label: 'Đã đánh giá' };
    case 'DISPATCH_FAILED':
      return { variant: 'danger', label: 'Điều phối thất bại' };
    default:
      return { variant: 'neutral', label: status };
  }
};

export const DispatchStepper: React.FC<DispatchStepperProps> = ({ status }) => {
  const currentStep = getStepNumber(status);
  const isCancelled = status === 'CANCELLED';
  const isFailed = status === 'DISPATCH_FAILED';
  const badgeInfo = getStatusBadgeInfo(status);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-brand-500" />
          Quy trình Vòng đời Đơn hàng
        </div>
        <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
      </div>

      {isCancelled ? (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/70 flex items-center gap-3">
          <XCircle className="w-6 h-6 text-rose-500 shrink-0" />
          <div>
            <div className="font-bold text-rose-900 text-sm">Đơn hàng đã bị hủy bỏ</div>
            <div className="text-xs text-rose-700 mt-0.5">
              Tiến trình phục vụ đã dừng. Không thể thực hiện các bước điều phối tiếp theo.
            </div>
          </div>
        </div>
      ) : isFailed ? (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/70 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
          <div>
            <div className="font-bold text-rose-900 text-sm">Điều phối thất bại</div>
            <div className="text-xs text-rose-700 mt-0.5">
              Hết thời gian chờ hoặc không tìm thấy thợ phù hợp nhận đơn.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-1 sm:gap-2 pt-2">
          {LIFECYCLE_STEPS.map((step) => {
            const isDone = currentStep > step.stepNum;
            const isCurrent = currentStep === step.stepNum;

            return (
              <div key={step.key} className="flex flex-col items-center text-center relative">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : isCurrent
                      ? 'bg-brand-600 text-white ring-4 ring-brand-100 shadow-sm animate-pulse'
                      : 'bg-white border-2 border-slate-200 text-slate-400'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4 stroke-[2.5]" /> : step.stepNum}
                </div>
                <div
                  className={`mt-2 text-[10px] sm:text-xs leading-tight ${
                    isCurrent
                      ? 'font-bold text-brand-700'
                      : isDone
                      ? 'font-medium text-emerald-700'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
