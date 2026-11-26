import type { ReactNode } from 'react';
import { Check, ScanEye } from 'lucide-react';
import { plural } from '@/lib/format';
import type { VisualMark } from '@/lib/resultRules';
import { cn } from '@/lib/utils';

/**
 * ScreenshotPlaceholder (08): the prototype has no real screenshots, so a grey box with a caption stands in.
 * A thumbnail with `onOpen` is a real button (click → viewer, 07-results 6.1).
 * Sizes: `thumb` 80 px wide · `preview` up to 240 px (an expanded step; the same element as its thumb, so switching
 * between the two grows or shrinks it, D84) · `panel` full width. Thumb and preview are 16:9 like every run (D27).
 */
export function ScreenshotPlaceholder({
  caption,
  size = 'panel',
  onOpen,
  openLabel,
  children,
  className,
}: {
  caption: string;
  size?: 'thumb' | 'preview' | 'panel';
  onOpen?: () => void;
  /** Accessible name of the open button, e.g. "Open screenshot of step 2". */
  openLabel?: string;
  children?: ReactNode;
  className?: string;
}) {
  const box = cn(
    'relative flex items-center justify-center overflow-hidden rounded-control border border-dashed border-border bg-bg text-center text-label font-normal text-text-muted',
    size === 'panel' ? 'aspect-video w-full' : 'aspect-video shrink-0 transition-[width] duration-200 ease-out',
    size === 'thumb' && 'w-20',
    size === 'preview' && 'w-[min(15rem,40%)]',
    className,
  );
  const body = (
    <>
      <span className={cn('px-2', size === 'thumb' && 'sr-only')}>{caption}</span>
      {size === 'thumb' && <span aria-hidden="true">shot</span>}
      {children}
    </>
  );
  return onOpen ? (
    <button type="button" onClick={onOpen} aria-label={openLabel ?? caption} className={cn(box, 'hover:border-accent')}>
      {body}
    </button>
  ) : (
    <div className={box} role="img" aria-label={caption}>
      {body}
    </div>
  );
}

/**
 * D88: the visual mark in the top-right corner of a step's screenshot. `thumb`: compact (icon + number, or a check),
 * `preview`: the full chip. Decorative: the screenshot button's accessible name says the same (see `visualMarkText`).
 * Solid fill and a surface ring so it stays readable over any screenshot.
 */
export function VisualMarkBadge({ mark, size }: { mark: Exclude<VisualMark, null>; size: 'thumb' | 'preview' }) {
  const changed = mark.kind === 'changed';
  const Icon = changed ? ScanEye : Check;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute right-1 top-1 inline-flex items-center rounded-pill font-semibold shadow-lift ring-1 ring-surface',
        changed ? 'bg-cc-fill text-cc-text' : 'bg-passed-fill text-passed-text',
        size === 'thumb' ? 'h-4 gap-0.5 px-1 text-[11px] leading-none' : 'h-[22px] gap-1 px-2 text-label',
      )}
    >
      <Icon className={size === 'thumb' ? 'size-3' : 'size-3.5'} />
      {size === 'thumb' ? (changed ? mark.areas : null) : changed ? plural(mark.areas, 'area') + ' changed' : 'Looks fine'}
    </span>
  );
}

/** D88: the mark in words, for the screenshot button's accessible name ("…, 3 areas changed"). */
export function visualMarkText(mark: VisualMark, compared: boolean): string {
  if (mark?.kind === 'changed') return `${plural(mark.areas, 'area')} changed`;
  if (mark?.kind === 'looks_fine') return 'visual change marked looks fine';
  return compared ? 'no visual change' : '';
}

/**
 * Prototype only: placeholder positions for changed areas when the result has no `visual.changedRegions` (D64;
 * open question 23: can the engine return the changed screenshot regions?).
 */
export const CHANGED_AREA_SPOTS = [
  { x: 0.18, y: 0.3, width: 0.32, height: 0.08 },
  { x: 0.1, y: 0.62, width: 0.8, height: 0.12 },
  { x: 0.05, y: 0.8, width: 0.9, height: 0.15 },
  { x: 0.6, y: 0.1, width: 0.3, height: 0.1 },
  { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
];

/** An outlined area on a screenshot (share of the screenshot, 0–1). */
export function AreaOutline({ rect, label, tone }: { rect: { x: number; y: number; width: number; height: number }; label: string; tone: 'changed' | 'ignored' | 'drawing' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute flex items-start justify-start rounded-sm border-2 p-0.5 text-left text-[11px] leading-tight',
        tone === 'changed' && 'border-cc-dot text-cc-text',
        tone === 'ignored' && 'items-end justify-end border-dashed border-text-muted bg-surface text-text-muted opacity-80',
        tone === 'drawing' && 'border-accent bg-accent-soft text-accent-soft-text opacity-90',
      )}
      style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }}
    >
      {label}
    </span>
  );
}
