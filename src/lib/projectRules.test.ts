import type { Run } from '@/data/types';
import {
  copyName,
  deleteConfirmed,
  hasErrors,
  lastCompletedRun,
  lastRun,
  needsAttention,
  projectNameError,
  validateNewProject,
  type NewProjectForm,
} from './projectRules';

const form = (over: Partial<NewProjectForm> = {}): NewProjectForm => ({
  name: 'Shop',
  environments: [
    { id: 'e1', name: 'Dev' },
    { id: 'e2', name: 'UAT' },
  ],
  platforms: [],
  ...over,
});

describe('validateNewProject (1.3)', () => {
  it('accepts a named project with unique environments and no platforms', () => {
    expect(hasErrors(validateNewProject(form()))).toBe(false);
  });
  it('requires a name', () => {
    expect(validateNewProject(form({ name: '  ' })).name).toBeDefined();
  });
  it('requires at least one environment', () => {
    expect(validateNewProject(form({ environments: [] })).environments).toBeDefined();
  });
  it('requires unique environment names (case and spaces ignored) and flags both', () => {
    const e = validateNewProject(form({ environments: [{ id: 'e1', name: 'UAT' }, { id: 'e2', name: ' uat ' }] }));
    expect(Object.keys(e.environmentNames)).toEqual(['e1', 'e2']);
  });
  it('requires environment names', () => {
    expect(validateNewProject(form({ environments: [{ id: 'e1', name: '' }] })).environmentNames.e1).toBeDefined();
  });
  it('ignores empty platform rows but requires a name when a platform has a URL', () => {
    expect(hasErrors(validateNewProject(form({ platforms: [{ id: 'a1', name: '', urls: { e1: '' } }] })))).toBe(false);
    expect(validateNewProject(form({ platforms: [{ id: 'a1', name: '', urls: { e1: 'https://x' } }] })).platformNames.a1).toBeDefined();
  });
});

const run = (number: number, state: Run['state'], testIds: string[] = ['a', 'b', 'c']) => ({ number, state, testIds }) as Run;

describe('Projects table summary (1.2)', () => {
  const runs = [run(12, 'completed'), run(14, 'running'), run(13, 'interrupted'), run(11, 'completed')];
  it('last run is the highest number in any state', () => expect(lastRun(runs)?.number).toBe(14));
  it('last completed run skips running and interrupted runs', () => expect(lastCompletedRun(runs)?.number).toBe(12));
  it('is empty without runs', () => {
    expect(lastRun([])).toBeUndefined();
    expect(needsAttention(undefined, [])).toEqual({ kind: 'no_completed_run' });
  });
  it('counts failed and couldn\'t complete of the last completed run', () => {
    const r = run(12, 'completed');
    expect(needsAttention(r, [{ testId: 'a', status: 'failed' }, { testId: 'b', status: 'couldnt_complete' }, { testId: 'c', status: 'passed' }])).toEqual({
      kind: 'issues',
      failed: 1,
      couldntComplete: 1,
    });
    expect(needsAttention(r, [{ testId: 'a', status: 'passed' }, { testId: 'b', status: 'passed' }])).toEqual({ kind: 'all_passed' });
  });
});

describe('BR-PROJECT-01 unique project names', () => {
  const names = ['qcfixer.com', 'Client HRMS'];
  it('blocks a name already used, ignoring case and spaces', () => {
    expect(validateNewProject(form({ name: ' QCFixer.com ' }), names).name).toBe('A project with this name already exists. Choose another name.');
    expect(validateNewProject(form({ name: 'Shop' }), names).name).toBeUndefined();
  });
  it('treats an empty name as missing, not as a duplicate', () => {
    expect(projectNameError('', names)).toBe('Enter a project name.');
  });
});

describe('BR-PROJECT-02 copy name', () => {
  it('adds (copy), then (copy 2)', () => {
    expect(copyName('qcfixer.com', ['qcfixer.com'])).toBe('qcfixer.com (copy)');
    expect(copyName('qcfixer.com', ['qcfixer.com', 'QCFIXER.COM (copy)'])).toBe('qcfixer.com (copy 2)');
  });
});

describe('deleteConfirmed (typed project name)', () => {
  it('needs the exact name', () => {
    expect(deleteConfirmed('qcfixer.com', 'qcfixer.com ')).toBe(true);
    expect(deleteConfirmed('qcfixer.com', 'QCFIXER.COM')).toBe(false);
  });
});
