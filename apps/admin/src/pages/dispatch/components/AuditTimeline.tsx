import React, { useState } from 'react';
import { BookingEventItem } from '../../../types';
import { Badge } from '../../../components/common/Badge';
import { getStatusBadgeInfo } from './DispatchStepper';
import { History, ChevronDown, ChevronUp, Clock, User, ArrowRight } from 'lucide-react';

interface AuditTimelineProps {
  events?: BookingEventItem[];
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ events = [] }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!events || events.length === 0) {
    return (
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
        <span>Chưa có sự kiện nhật ký nào được ghi nhận cho đơn hàng này.</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3.5 bg-slate-50/80 hover:bg-slate-100/70 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-brand-500" />
          <span>Nhật ký Tiến trình & Sự kiện Điều phối ({events.length})</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="text-[11px] font-normal">{isExpanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 max-h-[320px] overflow-y-auto">
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {events.map((evt, idx) => {
              const toBadge = getStatusBadgeInfo(evt.toStatus);
              const fromBadge = evt.fromStatus ? getStatusBadgeInfo(evt.fromStatus) : null;
              const isLatest = idx === events.length - 1;

              return (
                <div key={evt.id || idx} className="relative text-xs">
                  {/* Dot */}
                  <span
                    className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                      isLatest
                        ? 'bg-brand-600 ring-2 ring-brand-200'
                        : 'bg-slate-400'
                    }`}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400 font-medium">
                      {new Date(evt.createdAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}{' '}
                      • {new Date(evt.createdAt).toLocaleDateString('vi-VN')}
                    </span>

                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[10px] flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {evt.triggeredBy}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    {fromBadge && (
                      <>
                        <Badge variant={fromBadge.variant} size="sm">
                          {fromBadge.label}
                        </Badge>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      </>
                    )}
                    <Badge variant={toBadge.variant} size="sm">
                      {toBadge.label}
                    </Badge>
                  </div>

                  {evt.note && (
                    <div className="mt-1.5 p-2 bg-slate-50 rounded-lg text-slate-600 text-[11px] border border-slate-100">
                      {evt.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
