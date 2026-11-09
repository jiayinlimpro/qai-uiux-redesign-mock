import type { ReactNode } from 'react';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Loading state shared by all screens (CLAUDE.md rule 6). */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 p-6 text-text-muted">
      <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

/** Error state shared by all screens: a plain message, Retry when it can help, plus optional extra actions. */
export function ErrorState({ title, message, onRetry, children }: { title: string; message?: string; onRetry?: () => void; children?: ReactNode }) {
  return (
    <div role="alert" className="m-6 max-w-xl rounded-card border border-failed-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-failed-dot" />
        <div className="min-w-0">
          <h2 className="text-h3 text-text">{title}</h2>
          {message && <p className="mt-1 text-text-muted">{message}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {onRetry && (
              <Button variant="primary" onClick={onRetry}>
                Retry
              </Button>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
