import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  /** BR-LIST-05: min list 280 px, min detail 420 px. */
  minLeft?: number;
  minRight?: number;
  defaultLeft?: number;
  label: string;
}

const STEP = 24;
const HANDLE = 8; // w-2

/**
 * Draggable master–detail split (BR-LIST-05). The handle is a focusable separator: drag with the mouse,
 * or use ←/→ (Home/End for min/max) on the keyboard.
 */
export function SplitPane({ left, right, minLeft = 280, minRight = 420, defaultLeft = 420, label }: SplitPaneProps) {
  const root = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(defaultLeft);
  const [max, setMax] = useState(defaultLeft);

  const clamp = useCallback((w: number) => Math.round(Math.min(Math.max(w, minLeft), Math.max(minLeft, max))), [minLeft, max]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const update = () => setMax(el.clientWidth - minRight - HANDLE); // the handle takes width too
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minRight]);

  useEffect(() => setWidth((w) => clamp(w)), [clamp]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const start = e.clientX;
    const startWidth = width;
    const move = (ev: PointerEvent) => setWidth(clamp(startWidth + ev.clientX - start));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div ref={root} className="flex h-full min-h-0">
      <div className="relative min-h-0 shrink-0 overflow-hidden" style={{ width }}>
        {left}
      </div>
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label={label}
        aria-valuemin={minLeft}
        aria-valuemax={Math.max(minLeft, max)}
        aria-valuenow={width}
        onPointerDown={onPointerDown}
        onKeyDown={(e) => {
          const next = e.key === 'ArrowLeft' ? width - STEP : e.key === 'ArrowRight' ? width + STEP : e.key === 'Home' ? minLeft : e.key === 'End' ? max : null;
          if (next === null) return;
          e.preventDefault();
          setWidth(clamp(next));
        }}
        className={cn('group relative w-2 shrink-0 cursor-col-resize bg-bg focus-visible:outline-offset-[-2px]')}
      >
        <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border group-hover:w-0.5 group-hover:bg-accent" />
      </div>
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">{right}</div>
    </div>
  );
}
