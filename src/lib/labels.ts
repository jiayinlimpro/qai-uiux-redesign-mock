import type { Browser, CcReason, FailReason, Mode, RunState, Status, TestCase } from '@/data/types';

/** UI labels for run states (docs/02-glossary.md: Running, Paused, Interrupted, Completed). */
export const runStateLabels: Record<RunState, string> = {
  running: 'Running',
  paused: 'Paused',
  interrupted: 'Interrupted',
  completed: 'Completed',
};

/** BR-STATUS-01 (glossary): Passed · Failed · Couldn't complete · Not run. */
export const statusLabels: Record<Status, string> = {
  passed: 'Passed',
  failed: 'Failed',
  couldnt_complete: "Couldn't complete",
  not_run: 'Not run',
};

/** BR-REASON-01/02. */
export const reasonLabels: Record<FailReason | CcReason, string> = {
  product_bug: 'Product bug',
  needs_confirmation: 'Needs confirmation',
  test_data_problem: 'Test data problem',
  test_case_unclear: 'Test case unclear',
  blocked: 'Blocked',
  environment_down: 'Environment down',
  service_problem: 'QAI or AI service',
  ai_couldnt_finish: "AI couldn't finish",
};

/** Mode labels (glossary): AI · Script · Data rows. */
export const modeLabels: Record<Mode, string> = { ai: 'AI', script: 'Script', data_rows: 'Data rows' };

/** BR-STATUS-03: WebKit is labelled "Safari (WebKit)". */
export const browserLabels: Record<Browser, string> = { chrome: 'Chrome', firefox: 'Firefox', webkit: 'Safari (WebKit)' };

export const scriptLabels: Record<TestCase['script']['state'], string> = {
  recorded: 'Script: recorded',
  none: 'Script: none yet',
  failed_ai: 'Script: none (last AI run failed)',
  reset: 'Script: reset after edit',
};

export const sourceLabels: Record<TestCase['source'], string> = {
  import: 'Source: CSV import',
  written: 'Source: Written',
  ai_explore: 'Source: AI explore',
  clone: 'Source: Clone',
};
