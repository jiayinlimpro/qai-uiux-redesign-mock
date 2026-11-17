import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** A titled card section on a settings-style page (Knowledge, Project settings). `id` lets anchor chips scroll to it. */
export function SectionCard({ id, icon, title, description, action, children }: { id: string; icon?: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4 rounded-card border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <SectionHeading id={`${id}-title`} icon={icon} title={title} description={description} focusable />
        {action}
      </div>
      {children}
    </section>
  );
}

/** Empty section: one-line explanation (+ the section's add button sits in the header). */
export function SectionEmpty({ children }: { children: ReactNode }) {
  return <p className="rounded-control border border-dashed border-border px-4 py-5 text-center text-text-muted">{children}</p>;
}

/** Section title with an optional icon tile (D80): the tile marks the section, the title names it. */
export function SectionHeading({ id, icon: Icon, title, description, focusable }: { id: string; icon?: LucideIcon; title: string; description?: ReactNode; focusable?: boolean }) {
  return (
    <div className={cn('flex min-w-0 gap-3', description ? 'items-start' : 'items-center')}>
      {Icon && (
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-soft-text">
          <Icon aria-hidden="true" className="size-[18px]" />
        </span>
      )}
      <div className="min-w-0">
        <h2 id={id} tabIndex={focusable ? -1 : undefined} className="text-h3 focus:outline-none">
          {title}
        </h2>
        {description && <p className="text-label font-normal text-text-muted">{description}</p>}
      </div>
    </div>
  );
}
