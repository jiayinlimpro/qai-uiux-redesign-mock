import type { Mode, TestCase } from '@/data/types';

export interface ModeInput {
  scriptState: TestCase['script']['state'];
  hasTestData: boolean;
}

// BR-RUN-02: valid script and Force AI off → Script replay; otherwise → AI run.
// Glossary "Data rows": a test with test data runs once per row (row 1 by AI if no script, others replayed),
// and its mode label is "Data rows".
export function modeFor(test: ModeInput, forceAi: boolean): Mode {
  if (test.hasTestData) return 'data_rows';
  return test.scriptState === 'recorded' && !forceAi ? 'script' : 'ai';
}
