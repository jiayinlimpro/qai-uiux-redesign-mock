import { createLucideIcon } from 'lucide-react';

/**
 * AI explore's own icon (D82): a compass (exploring the platform) with the AI sparkle at its top-right, where the ring
 * breaks. Drawn on lucide's 24 px grid with its stroke, so it sizes, colours and takes `aria-hidden` like any lucide icon.
 * Use it wherever the meaning is "AI explore" (masthead button, Explore with AI, AI replies in a chat, Source: AI explore).
 * Plain `Sparkles` stays the sign for AI in general (AI run mode, AI settings, Suggest rows).
 */
export const AiExploreIcon = createLucideIcon('ai-explore', [
  ['path', { d: 'M18.94 12.46A8.5 8.5 0 1 1 11.54 5.06', key: 'ring' }],
  ['path', { d: 'M14.316 9.684L12.692 14.554A1.8 1.8 0 0 1 11.554 15.692L6.684 17.316L8.308 12.446A1.8 1.8 0 0 1 9.446 11.308Z', key: 'needle' }],
  [
    'path',
    {
      d: 'M17.592 7.04A0.88 0.88 0 0 0 16.96 6.408l-2.699-0.696a0.22 0.22 0 0 1 0-0.423L16.96 4.592A0.88 0.88 0 0 0 17.592 3.96l0.696-2.699a0.22 0.22 0 0 1 0.424 0L19.408 3.96A0.88 0.88 0 0 0 20.04 4.592l2.699 0.696a0.22 0.22 0 0 1 0 0.424L20.04 6.408a0.88 0.88 0 0 0-0.632 0.632l-0.696 2.699a0.22 0.22 0 0 1-0.424 0z',
      key: 'sparkle',
    },
  ],
]);
