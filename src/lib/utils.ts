import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge must know our token names (tailwind.config.ts), or it merges the wrong classes:
 * `text-label` would be read as a colour, and `bg-select-chevron` would replace `bg-surface`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['label', 'dense', 'base', 'h3', 'h2', 'h1', 'figure', 'display', 'display-sub'] }],
      'bg-image': [{ bg: ['select-chevron'] }],
      shadow: [{ shadow: ['lift', 'primary', 'popover', 'overlay'] }],
    },
  },
});

/** Merge Tailwind class names (shadcn/ui convention). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
