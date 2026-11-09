import { modeFor } from './runRules';

describe('BR-RUN-02 modeFor', () => {
  it('replays a recorded script unless Force AI is on', () => {
    expect(modeFor({ scriptState: 'recorded', hasTestData: false }, false)).toBe('script');
    expect(modeFor({ scriptState: 'recorded', hasTestData: false }, true)).toBe('ai');
  });
  it('uses AI when there is no valid script', () => {
    for (const scriptState of ['none', 'reset', 'failed_ai'] as const) {
      expect(modeFor({ scriptState, hasTestData: false }, false)).toBe('ai');
    }
  });
  it('labels tests with test data as Data rows', () => {
    expect(modeFor({ scriptState: 'reset', hasTestData: true }, false)).toBe('data_rows');
  });
});
