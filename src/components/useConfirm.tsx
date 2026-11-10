import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

export interface ConfirmOptions {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  /** Destructive actions use the danger button. */
  danger?: boolean;
  /** Label of the "no" button (default "Cancel"). */
  cancelLabel?: string;
  /** Focus the confirm button, so Enter accepts the default (e.g. "Also update rows?" defaults to Yes). */
  focusConfirm?: boolean;
}

/**
 * Awaitable confirmation: `if (await confirm({...})) …`. Render `dialog` once in the component.
 * Cancel (or cancelLabel), Close and Escape resolve false.
 */
export function useConfirm(): [(opts: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    setOpts(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  };

  const dialog = opts && (
    <Dialog
      title={opts.title}
      size="sm"
      onClose={() => finish(false)}
      footer={
        <>
          <Button onClick={() => finish(false)}>{opts.cancelLabel ?? 'Cancel'}</Button>
          <Button variant={opts.danger ? 'danger' : 'primary'} onClick={() => finish(true)} {...(opts.focusConfirm ? { 'data-autofocus': true } : {})}>
            {opts.confirmLabel}
          </Button>
        </>
      }
    >
      {opts.body}
    </Dialog>
  );

  return [confirm, dialog];
}
