import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

export interface ToastMessage {
  id: number;
  text: string;
  action?: { label: string; onClick: () => void };
}

/** Bottom toast with an optional action (e.g. Undo). Polite live region; closes after 8 s or with ×. */
export function Toast({ toast, onClose }: { toast: ToastMessage | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      {toast && (
        <div className="pointer-events-auto flex items-center gap-3 min-h-11 rounded-card bg-inverse py-1.5 pl-4 pr-2 text-inverse-text shadow-popover">
          <span>{toast.text}</span>
          {toast.action && (
            <button
              type="button"
              className="rounded-control px-2 py-1 font-semibold text-inverse-accent underline-offset-2 hover:underline"
              onClick={() => {
                toast.action!.onClick();
                onClose();
              }}
            >
              {toast.action.label}
            </button>
          )}
          <Button variant="ghost" size="sm" iconOnly aria-label="Close message" className="text-inverse-text hover:bg-transparent" onClick={onClose}>
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
