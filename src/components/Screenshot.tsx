import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * ScreenshotPlaceholder (08): the prototype has no real screenshots, so a grey box with a caption stands in.
 * A thumbnail with `onOpen` is a real button (click → viewer, 07-results 6.1).
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
  size?: 'thumb' | 'panel';
  onOpen?: () => void;
  /** Accessible name of the open button, e.g. "Open screenshot of step 2". */
  openLabel?: string;
  children?: ReactNode;
  className?: string;
}) {
  const box = cn(
    'relative flex items-center justify-center overflow-hidden rounded-control border border-dashed border-border bg-bg text-center text-label font-normal text-text-muted',
    size === 'thumb' ? 'h-12 w-20 shrink-0' : 'aspect-video w-full',
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
