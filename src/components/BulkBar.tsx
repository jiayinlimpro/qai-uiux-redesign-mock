import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * BulkBar (08, D80): appears when rows are ticked. Inverse, floating at the bottom centre of the window on one line,
 * so ticking rows never moves the list. Actions use `variant="inverse"` buttons (a primary button may stay primary).
 */
export function BulkBar({ label, count, onClear, children, floating = true }: { label: string; count: number; onClear: () => void; children: ReactNode; floating?: boolean }) {
  return (
    <div
      role="region"
      aria-label={label}
      className={cn(
        'flex items-center gap-1 overflow-x-auto whitespace-nowrap rounded-card bg-inverse py-1.5 pl-4 pr-1.5 text-inverse-text shadow-popover',
        // Inside a dialog the bar sits in place (static) above the list; on a page it floats.
        floating && 'fixed bottom-5 left-1/2 z-30 max-w-[calc(100vw-2rem)] -translate-x-1/2',
      )}
    >
      <span className="mr-2 text-dense font-semibold">{count} selected</span>
      {children}
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-inverse-hover" />
      <Button size="sm" variant="inverse" iconOnly aria-label="Clear selection" onClick={onClear}>
        <X aria-hidden="true" />
      </Button>
    </div>
  );
}
