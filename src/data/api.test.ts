import * as api from './api';
import { resetMockDb, setMockLatency } from './mock/store';

beforeAll(() => setMockLatency(0));
beforeEach(() => resetMockDb());

describe('api.ts (Slice 0)', () => {
  it('lists projects and returns copies, not store references', async () => {
    const projects = await api.listProjects();
    expect(projects.map((p) => p.name)).toEqual(['qcfixer.com', 'Client HRMS']);
    projects[0]!.name = 'changed';
    expect((await api.listProjects())[0]!.name).toBe('qcfixer.com');
  });

  it('searches tests by ID or title', async () => {
    expect((await api.listTests('p-qcfixer', { search: 'cnt-0' })).map((t) => t.testId)).toEqual([
      'CNT-01',
      'CNT-02',
      'CNT-03',
      'CNT-04',
    ]);
  });

  it('rejects unknown ids and unbuilt functions with typed errors', async () => {
    await expect(api.getProject('nope')).rejects.toBeInstanceOf(api.NotFoundError);
    await expect(api.overrideResult('res-12-cnt-04', { status: 'passed', reason: 'x', proofName: 'p.png' })).rejects.toBeInstanceOf(api.NotBuiltYetError);
  });

  it('lists runs newest first', async () => {
    expect((await api.listRuns('p-qcfixer')).map((r) => r.number)).toEqual([14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });
});
