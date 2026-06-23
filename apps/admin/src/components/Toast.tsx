import { useEffect } from 'react';
import { useToastContext } from '../context/ToastContext';
import type { Toast, ToastVariant } from '../hooks/useToast';

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-l-[#006b3c]',
  error:   'border-l-[#9b2c2c]',
  warning: 'border-l-[#92550a]',
  info:    'border-l-primary',
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-3 w-80 bg-surface rounded-lg shadow-lg border-l-4 p-4 ${variantStyles[toast.variant]}`}
    >
      <p className="flex-1 text-sm text-text-primary">{toast.message}</p>
      <button
        onClick={onClose}
        aria-label="Yopish"
        className="text-text-muted hover:text-text-primary transition-colors mt-0.5"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastContext();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-4 right-4 z-[200] flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
