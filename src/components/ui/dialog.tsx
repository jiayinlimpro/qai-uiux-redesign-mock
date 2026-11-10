import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface DialogProps {
  title: string;
  /** Called on Close, Escape, or the caller's Cancel. The caller decides what closing means (e.g. navigate back). */
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** 'md' = 720 px (forms), 'sm' = 480 px (confirmations), 'lg' = 1200 px (overlays such as Visual compare), 'xl' = 78% × 80% of the screen (Ready for Suites). 08: dialogs 720–820 px. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Close on a click outside the dialog (on the backdrop). The caller's onClose decides (e.g. ask first). */
  closeOnBackdrop?: boolean;
  /** Wraps body + footer in a form so Enter submits. */
  onSubmit?: () => void;
}

/**
 * Modal dialog on the native <dialog> element: focus moves in, stays in, returns to the trigger on close,
 * Escape closes, and the page behind is inert.
 */
export function Dialog({ title, onClose, children, footer, size = 'md', onSubmit, closeOnBackdrop }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Remember the trigger ourselves: route dialogs mount after navigation, when the browser's own record may be gone.
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!el.open) el.showModal();
    // A marked default ([data-autofocus]) gets focus, else the first field, else the first button.
    const first =
      el.querySelector<HTMLElement>('[data-autofocus]') ??
      el.querySelector<HTMLElement>('input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled])') ??
      el.querySelector<HTMLElement>('button:not([disabled])');
    first?.focus();
    return () => {
      el.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  const body = (
    <>
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>}
    </>
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={(e) => {
        // The dialog element itself is only hit outside its content box, i.e. on the backdrop.
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
      onCancel={(e) => {
        e.preventDefault(); // Escape: let the caller close (keeps React in charge of state)
        onClose();
      }}
      className={cn(
        'max-h-[85vh] w-[calc(100%-2rem)] flex-col rounded-card border border-border bg-surface p-0 text-text shadow-xl backdrop:bg-backdrop open:flex',
        size === 'xl' ? 'h-[80vh] max-h-[80vh] w-[78vw] max-w-[78vw]' : size === 'lg' ? 'max-w-[1200px]' : size === 'md' ? 'max-w-[720px]' : 'max-w-[480px]',
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <h2 id={titleId} className="text-h2">
          {title}
        </h2>
        <Button variant="ghost" size="sm" iconOnly aria-label="Close" onClick={onClose}>
          <X aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
      {onSubmit ? (
        <form
          className="flex min-h-0 flex-1 flex-col"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {body}
        </form>
      ) : (
        body
      )}
    </dialog>
  );
}
