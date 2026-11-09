import { countByStatus, countRunStatuses, latestStatus, passRate, sumCost } from './status';

describe('BR-STATUS-01 latestStatus', () => {
  it('uses the result from the highest-numbered run', () => {
    expect(latestStatus([{ status: 'failed', runNumber: 12 }, { status: 'passed', runNumber: 13 }, { status: 'couldnt_complete', runNumber: 5 }])).toBe('passed');
  });
  it('is Not run, never blank, for a test that has never run', () => {
    expect(latestStatus([])).toBe('not_run');
  });
});

describe('BR-STATUS-01 countByStatus', () => {
  it('counts each status', () => {
    const counts = countByStatus([
      { status: 'passed' },
      { status: 'passed' },
      { status: 'failed' },
      { status: 'couldnt_complete' },
    ]);
    expect(counts).toEqual({ passed: 2, failed: 1, couldnt_complete: 1, not_run: 0 });
  });
});

describe('BR-STATUS-01 countRunStatuses', () => {
  it('counts tests without a result as not run', () => {
    const counts = countRunStatuses(['a', 'b', 'c'], [{ testId: 'a', status: 'failed' }]);
    expect(counts).toEqual({ passed: 0, failed: 1, couldnt_complete: 0, not_run: 2 });
  });
});

describe('BR-STATUS-02 passRate', () => {
  it('excludes couldnt_complete and not_run', () => {
    expect(passRate({ passed: 72, failed: 8 })).toBeCloseTo(0.9);
  });
  it('is null when nothing passed or failed', () => {
    expect(passRate({ passed: 0, failed: 0 })).toBeNull();
  });
});

describe('BR-RUN-05 sumCost', () => {
  it('sums without floating-point drift', () => {
    expect(sumCost([0.1, 0.2])).toBe(0.3);
    expect(sumCost([])).toBe(0);
  });
});
