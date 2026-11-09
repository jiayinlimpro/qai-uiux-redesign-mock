import type { RunState } from '@/data/types';

/** UI labels for run states (docs/02-glossary.md: Running, Paused, Interrupted, Completed). */
export const runStateLabels: Record<RunState, string> = {
  running: 'Running',
  paused: 'Paused',
  interrupted: 'Interrupted',
  completed: 'Completed',
};
