import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface TabsProps<T extends string> {
  label: string;
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  idPrefix: string;
}

/** Tab list (ARIA tabs pattern): ←/→ move between tabs, Home/End jump. Panels use `${idPrefix}-panel-${id}`. */
export function Tabs<T extends string>({ label, tabs, value, onChange, idPrefix }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusTab = (i: number) => {
    const t = tabs[(i + tabs.length) % tabs.length]!;
    onChange(t.id);
    refs.current[(i + tabs.length) % tabs.length]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 border-b border-border">
      {tabs.map((t, i) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${t.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') focusTab(i + 1);
              else if (e.key === 'ArrowLeft') focusTab(i - 1);
              else if (e.key === 'Home') focusTab(0);
              else if (e.key === 'End') focusTab(tabs.length - 1);
              else return;
              e.preventDefault();
            }}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-base',
              selected ? 'border-accent font-semibold text-accent-soft-text' : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ idPrefix, id, children }: { idPrefix: string; id: string; children: React.ReactNode }) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} tabIndex={0} className="pt-4 focus:outline-none">
      {children}
    </div>
  );
}
