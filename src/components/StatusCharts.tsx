import { useState, type MouseEvent, type ReactNode } from 'react';
import { statusLabels } from '@/lib/labels';
import { formatPassRate, plural } from '@/lib/format';
import { CHART_STATUSES, barScale, drawnCount, passRateDonut, type ChartStatus, type SuiteRow } from '@/lib/overviewRules';
import type { StatusCounts } from '@/lib/status';
import { cn } from '@/lib/utils';

/*
 * Overview charts (D77): pass-rate donut and status by suite. Status colours are the chart tokens (docs/08-design-system.md);
 * colour is never the only signal: a legend with text, a hover tooltip and a text version for screen readers.
 */

const swatch: Record<ChartStatus, string> = { passed: 'bg-chart-passed', failed: 'bg-chart-failed', couldnt_complete: 'bg-chart-cc' };
const stroke: Record<ChartStatus, string> = { passed: 'stroke-chart-passed', failed: 'stroke-chart-failed', couldnt_complete: 'stroke-chart-cc' };

/** "5 passed, 2 failed, 1 couldn't complete, 2 not run" (zero counts left out). */
function countsText(c: StatusCounts): string {
  const parts = [...CHART_STATUSES, 'not_run' as const].filter((k) => c[k] > 0).map((k) => `${c[k]} ${statusLabels[k].toLowerCase()}`);
  return parts.length ? parts.join(', ') : 'no tests';
}

/** Hover tooltip that follows the pointer inside a relative container. Visual only: the same data is in text. */
function useHoverTip() {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const bind = (text: string) => ({
    onMouseMove: (e: MouseEvent<Element>) => {
      const box = (e.currentTarget as Element).closest('[data-chart]')!.getBoundingClientRect();
      setTip({ x: e.clientX - box.left, y: e.clientY - box.top, text });
    },
    onMouseLeave: () => setTip(null),
  });
  const node = tip && (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-control bg-text px-2 py-1 text-label text-surface"
      style={{ left: tip.x, top: tip.y - 10 }}
    >
      {tip.text}
    </span>
  );
  return [bind, node] as const;
}

function Legend({ children }: { children?: ReactNode }) {
  return (
    <ul aria-hidden="true" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-text-muted">
      {CHART_STATUSES.map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={cn('h-2.5 w-2.5 rounded-[2px]', swatch[s])} />
          {statusLabels[s]}
        </li>
      ))}
      {children}
    </ul>
  );
}

const SIZE = 184;
const BAND = 16;
const R = (SIZE - BAND) / 2;
const RING = 2 * Math.PI * R;
const GAP = 2; // surface gap between arcs

/**
 * Pass-rate donut: ring = passed, failed, couldn't complete; figure = pass rate (BR-STATUS-02). Not run is not drawn and is
 * named under the chart.
 */
export function PassRateDonut({ counts }: { counts: StatusCounts }) {
  const { rate, drawn, notRun, segments } = passRateDonut(counts);
  const [bind, tip] = useHoverTip();
  const gap = segments.length > 1 ? GAP : 0;
  return (
    <div className="flex flex-col items-center gap-4">
      <div data-chart className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} aria-hidden="true" focusable="false" className="-rotate-90">
          {drawn === 0 ? (
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={BAND} className="stroke-border" />
          ) : (
            segments.map((s) => {
              const len = Math.max((s.to - s.from) * RING - gap, 0.5);
              return (
                <circle
                  key={s.status}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  strokeWidth={BAND}
                  strokeDasharray={`${len} ${RING - len}`}
                  strokeDashoffset={-(s.from * RING + gap / 2)}
                  className={stroke[s.status]}
                  {...bind(`${statusLabels[s.status]}: ${plural(s.count, 'test')} (${Math.round((s.count / drawn) * 100)}%)`)}
                />
              );
            })
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-figure">{formatPassRate(rate)}</p>
          <p className="text-label text-text-muted">Pass rate</p>
        </div>
        {tip}
      </div>
      <p className="sr-only">
        Pass rate {rate === null ? 'not available: no passed or failed tests yet' : formatPassRate(rate)}. Latest status: {countsText(counts)}.
      </p>
      <ul aria-hidden="true" className="flex w-full max-w-[16rem] flex-col gap-1">
        {CHART_STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-[2px]', swatch[s])} />
            <span className="flex-1">{statusLabels[s]}</span>
            <span className="tabular-nums">{counts[s]}</span>
          </li>
        ))}
        <li className="flex items-center gap-2 text-text-muted">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-notrun" />
          <span className="flex-1">Not run (not in the chart)</span>
          <span className="tabular-nums">{notRun}</span>
        </li>
      </ul>
      <p className="text-label font-normal text-text-muted">Pass rate = passed ÷ (passed + failed)</p>
    </div>
  );
}

/** Status by suite: one stacked bar per Suites-table row, on one shared scale; value at the bar's end. */
export function SuiteStatusBars({ rows }: { rows: SuiteRow[] }) {
  const max = barScale(rows);
  const [bind, tip] = useHoverTip();
  return (
    <div className="flex flex-col gap-3">
      <Legend />
      <ul data-chart className="relative flex flex-col">
        {rows.map((r) => {
          const drawn = drawnCount(r.counts);
          return (
            <li key={r.suite?.id ?? 'not-in-a-suite'} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-center gap-3">
              <span className="truncate" title={r.name}>
                {r.name}
                <span className="sr-only">: {countsText(r.counts)}</span>
              </span>
              <span aria-hidden="true" className="flex h-7 min-w-0 items-center gap-2">
                {drawn > 0 && (
                  // The longest bar leaves room for its end label ("12 · 2 not run").
                  <span className="flex h-full shrink-0 gap-[2px]" style={{ width: `calc((100% - 7.5rem) * ${drawn / max})` }}>
                    {CHART_STATUSES.filter((s) => r.counts[s] > 0).map((s, i, shown) => (
                      <span
                        key={s}
                        className="flex h-full items-center"
                        style={{ flexGrow: r.counts[s], flexBasis: 0 }}
                        {...bind(`${r.name} · ${statusLabels[s]}: ${r.counts[s]} of ${plural(r.testIds.length, 'test')}`)}
                      >
                        <span className={cn('h-3.5 w-full', swatch[s], i === shown.length - 1 && 'rounded-r-[4px]')} />
                      </span>
                    ))}
                  </span>
                )}
                <span className="shrink-0 whitespace-nowrap text-text-muted">
                  {drawn > 0 ? <span className="tabular-nums text-text">{drawn}</span> : 'Not run yet'}
                  {drawn > 0 && r.counts.not_run > 0 && ` · ${r.counts.not_run} not run`}
                </span>
              </span>
            </li>
          );
        })}
        {tip}
      </ul>
    </div>
  );
}
