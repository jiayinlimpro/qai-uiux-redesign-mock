import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Plain semantic table inside a card. `dense` (D80): 13 px cells with tighter rows, for lists people scan (Runs, Projects, Overview). */
export function Table({ className, dense, ...props }: HTMLAttributes<HTMLTableElement> & { dense?: boolean }) {
  return (
    <div className="relative overflow-x-auto rounded-card border border-border bg-surface">
      <table className={cn('w-full border-collapse text-left text-base', dense && 'text-dense [&_td]:py-2.5', className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn('border-b border-border bg-surface-muted px-4 py-2.5 text-label text-text-muted', className)} {...props} />;
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-border px-4 py-3 align-middle', className)} {...props} />;
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('[&:last-child>td]:border-b-0', className)} {...props} />;
}
