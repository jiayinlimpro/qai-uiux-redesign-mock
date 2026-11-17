import type { ReactNode } from 'react';
import { CircleAlert, LoaderCircle, type LucideIcon } from 'lucide-react';
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

/** Empty state (08 EmptyState, D80): an icon tile, a title, one line of explanation and the next actions. No illustrations. */
export function EmptyState({ icon: Icon, title, children, actions, headingLevel = 2 }: { icon: LucideIcon; title: string; children?: ReactNode; actions?: ReactNode; headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <div className="flex flex-col items-center rounded-card border border-border bg-surface px-8 py-10 text-center">
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-card bg-accent-soft text-accent-soft-text">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <Heading className="text-h2">{title}</Heading>
      {children && <div className="mt-1 max-w-md text-text-muted">{children}</div>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
