import { useId } from 'react';
import { cn } from '@/lib/utils';

/*
 * The QAI mark (D76): a play triangle of three rounded gradient bars that weave over each other
 * (orange over purple at the top-left, green over orange at the bottom-left, purple over green where they cross).
 * Vector redraw of the supplied logo, centred in an 80 × 80 box. Same drawing as public/qai-mark.svg (favicon).
 */
// Measured from the supplied logo; centred on its bounds in the 80 x 80 box.
const SIDE = { x1: 16.75, y1: 12.25, x2: 16.75, y2: 67.75 }; // left bar (bottom end under the green cap)
const TOP = { x1: 16.75, y1: 14.75, x2: 63.25, y2: 40.45 }; // top bar, 29 degrees, to the point
const BOTTOM = { x1: 16.75, y1: 67.75, x2: 56.48, y2: 36.71 }; // bottom bar, 38 degrees, ends under the top bar
const BAR = 20;

export function QaiMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const g = (name: string) => `${id}-${name}`;
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false" className={cn('h-7 w-7 shrink-0', className)}>
      <defs>
        <linearGradient id={g('side')} gradientUnits="userSpaceOnUse" {...SIDE}>
          <stop offset="0" stopColor="#FDA421" />
          <stop offset="0.15" stopColor="#FD8141" />
          <stop offset="0.3" stopColor="#FB6942" />
          <stop offset="0.45" stopColor="#FB4F45" />
          <stop offset="0.6" stopColor="#FB3C46" />
          <stop offset="1" stopColor="#F8304A" />
        </linearGradient>
        <linearGradient id={g('top')} gradientUnits="userSpaceOnUse" {...TOP}>
          <stop offset="0" stopColor="#CC0050" />
          <stop offset="0.35" stopColor="#C3005B" />
          <stop offset="0.5" stopColor="#BA0F81" />
          <stop offset="0.65" stopColor="#A22DA4" />
          <stop offset="0.8" stopColor="#9048C1" />
          <stop offset="1" stopColor="#7C64EA" />
        </linearGradient>
        <linearGradient id={g('bottom')} gradientUnits="userSpaceOnUse" {...BOTTOM}>
          <stop offset="0" stopColor="#00C9A0" />
          <stop offset="0.15" stopColor="#00B29A" />
          <stop offset="0.3" stopColor="#009693" />
          <stop offset="0.45" stopColor="#007592" />
          <stop offset="0.6" stopColor="#005889" />
          <stop offset="0.75" stopColor="#044084" />
          <stop offset="1" stopColor="#08367F" />
        </linearGradient>
        {/* The top bar drawn again over the bottom bar where they cross (clear of the left bar). */}
        <clipPath id={g('over')}>
          <rect x="30" y="0" width="50" height="80" />
        </clipPath>
      </defs>
      <g fill="none" strokeLinecap="round" strokeWidth={BAR}>
        <line {...TOP} stroke={`url(#${g('top')})`} />
        <line {...SIDE} stroke={`url(#${g('side')})`} />
        <line {...BOTTOM} stroke={`url(#${g('bottom')})`} />
        <line {...TOP} stroke={`url(#${g('top')})`} clipPath={`url(#${g('over')})`} />
      </g>
    </svg>
  );
}
