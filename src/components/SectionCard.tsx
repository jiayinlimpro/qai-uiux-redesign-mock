import type { ReactNode } from 'react';

/** A titled card section on a settings-style page (Knowledge, Project settings). `id` lets anchor chips scroll to it. */
export function SectionCard({ id, title, description, action, children }: { id: string; title: string; description?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4 rounded-card border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={`${id}-title`} tabIndex={-1} className="text-h3 focus:outline-none">
            {title}
          </h2>
          {description && <p className="text-label font-normal text-text-muted">{description}</p>}
        </div>
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
