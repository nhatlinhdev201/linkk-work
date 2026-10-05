import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  description?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconBgColor = 'bg-brand-50 text-brand-600 border border-brand-100',
  trend,
  description,
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
          {title}
        </span>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${iconBgColor}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>

        {(trend || description) && (
          <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
            {trend && (
              <span
                className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded ${
                  trend.isPositive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                {trend.isPositive ? (
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-rose-600" />
                )}
                {trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}
              </span>
            )}
            <span className="text-slate-400">
              {trend?.label || description}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
