import type { Toast } from '../hooks/useToast';
import { X } from 'lucide-react';

interface Props {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const colors = {
  success: 'bg-brand-success/20 border-brand-success/50 text-brand-success',
  error: 'bg-brand-error/20 border-brand-error/50 text-brand-error',
  info: 'bg-brand-navy/30 border-brand-navy/50 text-brand-orange',
};

export default function ToastContainer({ toasts, removeToast }: Props) {
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-5 py-3 rounded-lg border backdrop-blur-xl animate-slide-up ${colors[t.type]}`}
        >
          <span className="text-sm font-mono flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="opacity-60 hover:opacity-100 transition">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
