import React, { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, required, className = '', id, ...props }, ref) => {
    const reactGeneratedId = useId();
    const selectId = id || reactGeneratedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700">
            {label} {required && <span className="text-rose-500 font-bold">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          required={required}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-150 focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:cursor-not-allowed ${
            error
              ? 'border-rose-400 text-rose-950 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/20'
              : 'border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-brand-500/20 shadow-sm'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5 animate-fade-in">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
