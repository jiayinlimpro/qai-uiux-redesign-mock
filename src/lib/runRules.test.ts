import { modeFor, snapshotEnvironment } from './runRules';

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

describe('BR-ENV-04 snapshotEnvironment', () => {
  const project = {
    environments: [{ id: 'uat', name: 'UAT' }, { id: 'prod', name: 'Prod' }],
    apps: [
      { id: 'web', name: 'Customer website', urls: { uat: 'https://uat.x', prod: 'https://x' } },
      { id: 'admin', name: 'Admin portal', urls: { uat: 'https://uat-admin.x', prod: null } },
    ],
  };
  it('records the environment name and each app URL used', () => {
    expect(snapshotEnvironment(project, 'prod')).toEqual({
      name: 'Prod',
      apps: [
        { appId: 'web', name: 'Customer website', url: 'https://x' },
        { appId: 'admin', name: 'Admin portal', url: null },
      ],
    });
  });
  it('is a copy: later renames do not change it', () => {
    const snap = snapshotEnvironment(project, 'uat');
    project.environments[0]!.name = 'SIT';
    expect(snap.name).toBe('UAT');
  });
});
