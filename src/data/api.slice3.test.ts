import * as api from './api';
import { getDb, resetMockDb, setMockLatency } from './mock/store';

beforeAll(() => setMockLatency(0));
beforeEach(() => resetMockDb());

const fileOf = async (blob: Blob) => new File([await blob.text()], 'x.json', { type: 'application/json' });

describe('accounts (Slice 3)', () => {
  it('lists accounts without passwords; the password is revealed only on request', async () => {
    const accounts = await api.listAccounts('p-qcfixer');
    expect(accounts.map((a) => a.role)).toEqual(['Admin', 'Registered customer']);
    expect(JSON.stringify(accounts)).not.toContain('Uat-Admin-2026!');
    expect(await api.revealAccountPassword('acc-admin')).toBe('Uat-Admin-2026!');
  });

  it('adds and edits an account; an empty password keeps the saved one', async () => {
    const a = await api.saveAccount({ projectId: 'p-qcfixer', role: 'Admin', platformId: 'platform-admin', environmentId: 'env-prod', username: 'prod.admin' }, 'p1');
    expect(a.hasPassword).toBe(true);
    const edited = await api.saveAccount({ ...a, username: 'prod.admin2' }, '');
    expect(edited).toMatchObject({ id: a.id, username: 'prod.admin2', hasPassword: true });
    expect(await api.revealAccountPassword(a.id)).toBe('p1');
  });

  it('BR-ENV-03: role + platform + environment is unique', async () => {
    await expect(
      api.saveAccount({ projectId: 'p-qcfixer', role: 'admin', platformId: 'platform-admin', environmentId: 'env-uat', username: 'x' }, 'p'),
    ).rejects.toBeInstanceOf(api.DuplicateAccountError);
  });

  it('deletes an account and its password', async () => {
    await api.deleteAccount('acc-admin');
    expect((await api.listAccounts('p-qcfixer')).map((a) => a.id)).toEqual(['acc-customer']);
    expect(getDb().accountPasswords['acc-admin']).toBeUndefined();
  });
});

describe('platforms and environments (Slice 3)', () => {
  it('removing an environment removes its accounts and URLs, keeps runs', async () => {
    const p = await api.getProject('p-qcfixer');
    await api.updateProject({ ...p, environments: p.environments.filter((e) => e.id !== 'env-uat') });
    const after = await api.getProject('p-qcfixer');
    expect(after.environments.map((e) => e.name)).toEqual(['Dev', 'Prod']);
    expect(after.platforms.every((a) => !('env-uat' in a.urls))).toBe(true);
    expect(await api.listAccounts('p-qcfixer')).toEqual([]);
    expect((await api.listRuns('p-qcfixer')).length).toBe(14);
  });

  it('removing a platform removes its accounts', async () => {
    const p = await api.getProject('p-qcfixer');
    await api.updateProject({ ...p, platforms: p.platforms.filter((a) => a.id !== 'platform-admin') });
    expect((await api.listAccounts('p-qcfixer')).map((a) => a.role)).toEqual(['Registered customer']);
  });

  it('renames environments and edits URLs without touching accounts', async () => {
    const p = await api.getProject('p-qcfixer');
    const environments = p.environments.map((e) => (e.id === 'env-uat' ? { ...e, name: 'SIT' } : e));
    const platforms = p.platforms.map((a) => (a.id === 'platform-admin' ? { ...a, urls: { ...a.urls, 'env-prod': 'https://admin.qcfixer.com' } } : a));
    await api.updateProject({ ...p, environments, platforms });
    const after = await api.getProject('p-qcfixer');
    expect(after.environments.map((e) => e.name)).toEqual(['Dev', 'SIT', 'Prod']);
    expect(after.platforms.find((a) => a.id === 'platform-admin')!.urls['env-prod']).toBe('https://admin.qcfixer.com');
    expect((await api.listAccounts('p-qcfixer')).length).toBe(2);
  });
});

describe('knowledge (Slice 3)', () => {
  it('lists the sample documents and skills', async () => {
    const items = await api.listKnowledge('p-qcfixer');
    expect(items.filter((k) => k.kind === 'document').map((k) => k.name)).toEqual(['Contact form FRS.pdf', 'Customer website user stories.docx']);
    expect(items.filter((k) => k.kind === 'skill').map((k) => k.name)).toEqual(['testing-rules.md', 'qcfixer-web']);
  });

  it('uploads a document, edits its scope, replaces it, deletes it', async () => {
    const doc = await api.saveKnowledge({ projectId: 'p-qcfixer', kind: 'document', docType: 'frs', name: 'Footer FRS.pdf', scope: { kind: 'project' } }, { name: 'Footer FRS.pdf' });
    const scoped = await api.saveKnowledge({ ...doc, scope: { kind: 'test', testId: 't-ftr-01' } });
    expect(scoped.uploadedAt).toBe(doc.uploadedAt); // scope edit is not a new upload
    const replaced = await api.saveKnowledge({ ...scoped, name: 'Footer FRS v2.pdf' }, { name: 'Footer FRS v2.pdf' });
    expect(replaced).toMatchObject({ id: doc.id, name: 'Footer FRS v2.pdf', scope: { kind: 'test', testId: 't-ftr-01' } });
    await api.deleteKnowledge(doc.id);
    expect((await api.listKnowledge('p-qcfixer')).some((k) => k.id === doc.id)).toBe(false);
  });

  it('deleting a knowledge item unlinks it from tests', async () => {
    getDb().tests.find((t) => t.id === 't-cnt-02')!.linkedKnowledge = ['k-contact-frs'];
    await api.deleteKnowledge('k-contact-frs');
    expect((await api.getTest('t-cnt-02')).linkedKnowledge).toEqual([]);
  });
});

describe('handover keeps account passwords (Slice 3)', () => {
  it('export → import as a copy carries passwords to the new account IDs', async () => {
    const copy = await api.importProject(await fileOf(await api.exportProject('p-qcfixer')), 'copy');
    const accounts = await api.listAccounts(copy.id);
    expect(accounts).toHaveLength(2);
    expect(accounts.every((a) => a.id !== 'acc-admin' && a.hasPassword)).toBe(true);
    expect(await api.revealAccountPassword(accounts.find((a) => a.role === 'Admin')!.id)).toBe('Uat-Admin-2026!');
  });
});

describe('BR-ENV-04: history keeps the environment snapshot', () => {
  it('renaming or deleting an environment does not change past runs', async () => {
    const p = await api.getProject('p-qcfixer');
    await api.updateProject({ ...p, environments: p.environments.map((e) => (e.id === 'env-uat' ? { ...e, name: 'SIT' } : e)) });
    expect((await api.getRun('run-12')).environment.name).toBe('UAT');
    const renamed = await api.getProject('p-qcfixer');
    await api.updateProject({ ...renamed, environments: renamed.environments.filter((e) => e.id !== 'env-uat') });
    const r12 = await api.getRun('run-12');
    expect(r12.environment.name).toBe('UAT');
    expect(r12.environment.platforms.find((a) => a.name === 'Customer website')!.url).toBe('https://uat.qcfixer.com');
  });
});

describe('D37 export without account passwords', () => {
  it('leaves passwords out and marks the accounts as having none', async () => {
    const blob = await api.exportProject('p-qcfixer', { includePasswords: false });
    const text = await blob.text();
    expect(text).not.toContain('Uat-Admin-2026!');
    const parsed = JSON.parse(text) as { accounts: { hasPassword: boolean }[]; accountPasswords: unknown[] };
    expect(parsed.accounts.every((a) => !a.hasPassword)).toBe(true);
    expect(parsed.accountPasswords).toEqual([]);
    expect(await (await api.exportProject('p-qcfixer')).text()).toContain('Uat-Admin-2026!'); // default: included
  });
});

describe('older project files (before D73: apps → platforms)', () => {
  it('importing an export that still says "apps" / "appId" works', async () => {
    const blob = await api.exportProject('p-qcfixer');
    const legacy = (await blob.text()).replace(/"platforms"/g, '"apps"').replace(/"platformId"/g, '"appId"');
    const imported = await api.importProject(new File([legacy], 'old.json'), 'copy');
    expect(imported.platforms.map((p) => p.name)).toEqual(['Customer website', 'Admin portal']);
    const accounts = await api.listAccounts(imported.id);
    expect(accounts.every((a) => imported.platforms.some((p) => p.id === a.platformId))).toBe(true);
  });
});
