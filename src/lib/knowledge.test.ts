import {
  aiStepsWarning,
  checkDocumentFile,
  platformAccountCount,
  checkExtensionFolder,
  duplicateAccount,
  environmentUsage,
  parseRunDefaults,
  scopeLabel,
  skillKindFor,
  skipReason,
  summarizeSkillFolder,
} from './knowledge';
import { toProjectPlatforms, validatePlatformsEnvironments } from './projectRules';

describe('scopeLabel (Applies to)', () => {
  const suites = [{ id: 's9', name: '09 Contact Us' }];
  const tests = [{ id: 't4', testId: 'CNT-04', title: 'Contact phone and email links' }];
  it('names the scope', () => {
    expect(scopeLabel({ kind: 'project' }, suites, tests)).toBe('Project-wide');
    expect(scopeLabel({ kind: 'suite', suiteId: 's9' }, suites, tests)).toBe('Suite: 09 Contact Us');
    expect(scopeLabel({ kind: 'test', testId: 't4' }, suites, tests)).toBe('Test: CNT-04 Contact phone and email links');
  });
});

describe('skills (legacy rules kept)', () => {
  it('derives the kind from what was loaded', () => {
    expect(skillKindFor('qcfixer-web', true)).toBe('codebase');
    expect(skillKindFor('testing-rules.MD', false)).toBe('instructions');
    expect(skillKindFor('spec.docx', false)).toBe('instructions');
    expect(skillKindFor('prices.xlsx', false)).toBe('reference');
  });
  it('skips dependency/build folders, secrets, binaries and logs', () => {
    expect(skipReason('node_modules/react/index.js')).toBe('dependency_or_build');
    expect(skipReason('web/.git/HEAD')).toBe('dependency_or_build');
    expect(skipReason('web/dist/app.js')).toBe('dependency_or_build');
    expect(skipReason('.env')).toBe('secret');
    expect(skipReason('config/.env.local')).toBe('secret');
    expect(skipReason('certs/server.pem')).toBe('secret');
    expect(skipReason('deploy/id_rsa')).toBe('secret');
    expect(skipReason('logs/app.log')).toBe('binary_or_log');
    expect(skipReason('tools/setup.exe')).toBe('binary_or_log');
    expect(skipReason('src/pages/contact.tsx')).toBeNull();
    expect(skipReason('src/environment.ts')).toBeNull();
  });
  it('summarises a folder and applies the 5000 files / 100 MB limit to kept files', () => {
    expect(summarizeSkillFolder([{ path: 'src/a.ts', size: 10 }, { path: 'node_modules/x.js', size: 10 }, { path: '.env', size: 1 }])).toMatchObject({
      kept: 1,
      skipped: 2,
      overLimit: false,
    });
    expect(summarizeSkillFolder([{ path: 'big.sql', size: 101 * 1024 * 1024 }]).overLimit).toBe(true);
  });
  it('lists what was skipped: a skipped folder once, other files by path, with the reason', () => {
    const s = summarizeSkillFolder([
      { path: 'src/a.ts', size: 1 },
      { path: 'node_modules/react/index.js', size: 1 },
      { path: 'node_modules/react/package.json', size: 1 },
      { path: 'web/dist/app.js', size: 1 },
      { path: '.env', size: 1 },
      { path: 'logs/app.log', size: 1 },
    ]);
    expect(s.skippedEntries).toEqual([
      { path: '.env', reason: 'secret' },
      { path: 'logs/app.log', reason: 'binary_or_log' },
      { path: 'node_modules/', reason: 'dependency_or_build' },
      { path: 'web/dist/', reason: 'dependency_or_build' },
    ]);
    expect(s.skipped).toBe(5);
  });
});

describe('D39 document files', () => {
  const MB = 1024 * 1024;
  it('accepts only the listed types', () => {
    for (const n of ['a.pdf', 'a.docx', 'a.md', 'a.txt', 'a.xlsx', 'a.csv', 'a.json', 'a.png', 'A.JPG']) expect(checkDocumentFile(n, 10).ok).toBe(true);
    for (const n of ['a.doc', 'a.exe', 'a.zip', 'a.jpeg', 'noext']) expect(checkDocumentFile(n, 10).ok).toBe(false);
  });
  it('limits pdf/docx/xlsx to 20 MB and text files to 2 MB', () => {
    expect(checkDocumentFile('a.pdf', 20 * MB).ok).toBe(true);
    expect(checkDocumentFile('a.pdf', 20 * MB + 1).ok).toBe(false);
    expect(checkDocumentFile('a.md', 2 * MB).ok).toBe(true);
    const big = checkDocumentFile('a.json', 2 * MB + 1);
    expect(!big.ok && big.message).toBe('a.json is too large: the limit for .json files is 2 MB.');
  });
});

describe('browser extension folder (2.2)', () => {
  it('needs chrome, firefox and safari sub-folders', () => {
    expect(checkExtensionFolder(['ext/chrome/manifest.json', 'ext/firefox/manifest.json', 'ext/safari/Info.plist'])).toEqual({ folder: 'ext', missing: [] });
    expect(checkExtensionFolder(['ext/chrome/manifest.json'])).toEqual({ folder: 'ext', missing: ['firefox', 'safari'] });
  });
});

describe('BR-ENV-03 account uniqueness (role + platform + environment)', () => {
  const accounts = [{ id: 'a1', role: 'Admin', platformId: 'platform', environmentId: 'uat' }];
  it('finds a clash, ignoring case of the role and the account being edited', () => {
    expect(duplicateAccount(accounts, { role: ' admin ', platformId: 'platform', environmentId: 'uat' })?.id).toBe('a1');
    expect(duplicateAccount(accounts, { id: 'a1', role: 'Admin', platformId: 'platform', environmentId: 'uat' })).toBeUndefined();
    expect(duplicateAccount(accounts, { role: 'Admin', platformId: 'platform', environmentId: 'prod' })).toBeUndefined();
  });
});

describe('removing environments and platforms (2.4)', () => {
  it('counts what depends on an environment or platform', () => {
    const accounts = [{ environmentId: 'uat', platformId: 'admin' }, { environmentId: 'uat', platformId: 'web' }];
    const runs = [{ environmentId: 'uat' }, { environmentId: 'prod' }];
    expect(environmentUsage('uat', accounts, runs)).toEqual({ accounts: 2, runs: 1 });
    expect(environmentUsage('dev', accounts, runs)).toEqual({ accounts: 0, runs: 0 });
    expect(platformAccountCount('admin', accounts)).toBe(1);
  });
});

describe('platforms × environments grid', () => {
  it('validates like New project and stores empty URLs as null', () => {
    const envs = [{ id: 'e1', name: 'UAT' }];
    expect(validatePlatformsEnvironments(envs, [{ id: 'a', name: '', urls: { e1: 'https://x' } }]).platformNames.a).toBeDefined();
    expect(toProjectPlatforms(envs, [{ id: 'a', name: ' Web ', urls: { e1: ' ' } }, { id: 'b', name: '', urls: {} }])).toEqual([{ id: 'a', name: 'Web', urls: { e1: null } }]);
  });
});

describe('BR-RUN-12 run defaults (2.2, D38)', () => {
  const form = { headless: false, parallel: true, workers: '2', maxAiSteps: '40', maxActionsPerStep: '10' };
  it('parses whole numbers within the limits', () => {
    expect(parseRunDefaults(form)).toEqual({ ok: true, value: { headless: false, parallel: true, workers: 2, maxAiSteps: 40, maxActionsPerStep: 10 } });
    const bad = parseRunDefaults({ ...form, workers: '0', maxAiSteps: '2.5', maxActionsPerStep: '' });
    expect(bad.ok).toBe(false);
    expect(!bad.ok && Object.keys(bad.errors).sort()).toEqual(['maxActionsPerStep', 'maxAiSteps', 'workers']);
  });
  it('workers 1–8, max AI steps 1–500, max actions 1–50', () => {
    expect(parseRunDefaults({ ...form, workers: '8', maxAiSteps: '500', maxActionsPerStep: '50' }).ok).toBe(true);
    const over = parseRunDefaults({ ...form, workers: '9', maxAiSteps: '501', maxActionsPerStep: '51' });
    expect(!over.ok && over.errors).toEqual({
      workers: 'Enter a whole number from 1 to 8.',
      maxAiSteps: 'Enter a whole number from 1 to 500.',
      maxActionsPerStep: 'Enter a whole number from 1 to 50.',
    });
  });
  it('warns, without blocking, above 100 AI steps', () => {
    expect(aiStepsWarning('100')).toBeUndefined();
    expect(aiStepsWarning('101')).toBe('Higher values increase AI cost per test.');
    expect(aiStepsWarning('501')).toBeUndefined(); // that is an error, not a warning
  });
});
