import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle2, XCircle, X } from 'lucide-react';
import { Button } from '../common/Button';

export type ConfirmVariant = 'primary' | 'danger' | 'warning' | 'info';

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  confirmButtonVariant?: 'primary' | 'danger' | 'outline';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = (): ((options: ConfirmOptions) => Promise<boolean>) => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setOptions(opts);
      setIsOpen(true);
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  }, []);

  // Keyboard shortcut listener: ESC to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Auto-focus cancel button for safe keyboard accessibility
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleCancel]);

  const variant = options?.variant || 'primary';

  const renderIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
            <XCircle className="w-6 h-6" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case 'info':
        return (
          <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
            <Info className="w-6 h-6" />
          </div>
        );
      case 'primary':
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-brand-100 border border-brand-200 text-brand-600 flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        );
    }
  };

  const getConfirmButtonVariant = (): 'primary' | 'danger' | 'outline' => {
    if (options?.confirmButtonVariant) return options.confirmButtonVariant;
    if (variant === 'danger') return 'danger';
    return 'primary';
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {/* Global Confirmation Modal Dialog */}
      {isOpen && options && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={handleCancel}
            aria-hidden="true"
          />

          {/* Dialog Container */}
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-10 transform transition-all animate-scale-in"
          >
            {/* Top Close Button */}
            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              aria-label="Đóng hộp thoại"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Dialog Body */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                {renderIcon()}
                <div className="space-y-1.5 flex-1 pr-6">
                  <h3
                    id="confirm-dialog-title"
                    className="text-base font-bold text-slate-900 tracking-tight leading-snug"
                  >
                    {options.title}
                  </h3>
                  <div
                    id="confirm-dialog-description"
                    className="text-xs sm:text-sm text-slate-600 leading-relaxed"
                  >
                    {options.message}
                  </div>
                </div>
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <Button
                ref={cancelButtonRef}
                type="button"
                variant="outline"
                size="md"
                onClick={handleCancel}
                className="text-xs font-semibold"
              >
                {options.cancelText || 'Hủy bỏ'}
              </Button>
              <Button
                type="button"
                variant={getConfirmButtonVariant()}
                size="md"
                onClick={handleConfirm}
                className="text-xs font-bold shadow-xs"
              >
                {options.confirmText || 'Xác nhận'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
