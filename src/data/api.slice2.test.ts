import * as api from './api';
import { resetMockDb, setMockLatency } from './mock/store';

beforeAll(() => setMockLatency(0));
beforeEach(() => resetMockDb());

const fileOf = async (blob: Blob, name = 'x.json') => new File([await blob.text()], name, { type: 'application/json' });

describe('global settings (Slice 2)', () => {
  it('starts with no provider (first launch → Welcome)', async () => {
    expect((await api.getGlobalSettings()).providers).toEqual([]);
  });

  it('adds a provider without ever returning its secret', async () => {
    const p = await api.saveProvider({ kind: 'openai', label: 'OpenAI', defaultModel: 'gpt-4.1' }, { apiKey: 'sk-secret' });
    expect(p.hasSecret).toBe(true);
    const settings = await api.getGlobalSettings();
    expect(settings.providers).toHaveLength(1);
    expect(JSON.stringify(settings)).not.toContain('sk-secret');
  });

  it('keeps the saved secret when an edit leaves the key empty', async () => {
    const p = await api.saveProvider({ kind: 'openai', label: 'OpenAI', defaultModel: 'gpt-4.1' }, { apiKey: 'sk' });
    const edited = await api.saveProvider({ ...p, defaultModel: 'gpt-4o' }, { apiKey: '' });
    expect(edited).toMatchObject({ id: p.id, defaultModel: 'gpt-4o', hasSecret: true });
    expect((await api.getGlobalSettings()).providers).toHaveLength(1);
  });

  it('saves cost saving with a write-only TypeSafe key', async () => {
    const s = await api.getGlobalSettings();
    const saved = await api.saveGlobalSettings({ ...s, costSaving: { ...s.costSaving, enabled: true } }, { typeSafeKey: 'ts-1' });
    expect(saved.costSaving).toMatchObject({ enabled: true, hasKey: true, typeSafeModel: 'jev-latest' });
    expect(JSON.stringify(saved)).not.toContain('ts-1');
  });

  it('lists models per provider; AWS Bedrock uses a typed model id', async () => {
    expect(await api.listModels('openai')).toContain('gpt-4.1');
    expect(await api.listModels('aws_bedrock')).toEqual([]);
  });
});

describe('projects (Slice 2)', () => {
  it('creates a project with default settings', async () => {
    const p = await api.createProject({
      name: ' Shop ',
      defaultModel: 'gpt-4.1',
      environments: [{ id: 'e1', name: 'SIT' }],
      platforms: [{ id: 'a1', name: 'Store', urls: { e1: 'https://sit.shop.test' } }],
    });
    expect(p.name).toBe('Shop');
    expect(p.settings.visualComparison).toBe(true);
    expect(p.settings.runDefaults).toEqual({ headless: false, parallel: false, workers: 2, maxAiSteps: 40, maxActionsPerStep: 10 });
    expect((await api.listProjects()).map((x) => x.name)).toEqual(['qcfixer.com', 'Client HRMS', 'Shop']);
  });

  it('renames a project', async () => {
    const p = await api.getProject('p-hrms');
    await api.updateProject({ ...p, name: 'HRMS' });
    expect((await api.getProject('p-hrms')).name).toBe('HRMS');
  });

  it('deletes a project and everything in it', async () => {
    await api.deleteProject('p-qcfixer');
    await expect(api.getProject('p-qcfixer')).rejects.toBeInstanceOf(api.NotFoundError);
    expect(await api.listRuns('p-qcfixer')).toEqual([]);
    expect(await api.listLibraryTests('p-qcfixer')).toEqual([]);
    expect(await api.listResults('run-12')).toEqual([]);
  });

  it('exports and imports a project (handover) with its history', async () => {
    const file = await fileOf(await api.exportProject('p-qcfixer'));
    await expect(api.importProject(file)).rejects.toBeInstanceOf(api.ProjectExistsError);
    await api.deleteProject('p-qcfixer');
    const imported = await api.importProject(file);
    expect(imported.name).toBe('qcfixer.com');
    expect((await api.listRuns('p-qcfixer')).length).toBe(14);
    expect((await api.listResults('run-12')).length).toBe(83);
    expect((await api.listChats('p-qcfixer')).length).toBe(3);
  });

  it('rejects a file that is not a project export', async () => {
    await expect(api.importProject(new File(['{"a":1}'], 'x.json'))).rejects.toBeInstanceOf(api.InvalidFileError);
    await expect(api.importProject(new File(['not json'], 'x.json'))).rejects.toBeInstanceOf(api.InvalidFileError);
  });
});

describe('Slice 2 review changes', () => {
  const openai = { kind: 'openai' as const, label: 'OpenAI', defaultModel: 'gpt-4.1' };
  const anthropic = { kind: 'anthropic' as const, label: 'Anthropic', defaultModel: 'claude-sonnet-5-5' };

  it('BR-PROVIDER-02: the last provider cannot be removed', async () => {
    const p = await api.saveProvider(openai, { apiKey: 'k' });
    await expect(api.removeProvider(p.id)).rejects.toBeInstanceOf(api.LastProviderError);
  });

  it('BR-PROVIDER-03: projects on the removed provider switch to the next default model and are reported', async () => {
    const o = await api.saveProvider(openai, { apiKey: 'k' });
    await api.saveProvider(anthropic, { apiKey: 'k' });
    const { switched } = await api.removeProvider(o.id);
    expect(switched.map((s) => [s.projectName, s.from, s.to])).toEqual([
      ['qcfixer.com', 'gpt-4.1', 'claude-sonnet-5-5'],
      ['Client HRMS', 'gpt-4.1', 'claude-sonnet-5-5'],
    ]);
    expect((await api.getProject('p-qcfixer')).defaultModel).toBe('claude-sonnet-5-5');
    expect((await api.getGlobalSettings()).providers.map((p) => p.label)).toEqual(['Anthropic']);
  });

  it('never saves half of an AWS key pair', async () => {
    await expect(
      api.saveProvider({ kind: 'aws_bedrock', label: 'AWS Bedrock', defaultModel: 'm', region: 'us-east-1' }, { accessKeyId: 'A' }),
    ).rejects.toThrow('Enter both');
    expect((await api.getGlobalSettings()).providers).toEqual([]);
  });

  it('BR-PROJECT-01: blocks duplicate project names on create and rename (case-insensitive)', async () => {
    const input = { name: 'QCFIXER.COM', defaultModel: 'gpt-4.1', environments: [{ id: 'e', name: 'UAT' }], platforms: [] };
    await expect(api.createProject(input)).rejects.toBeInstanceOf(api.DuplicateProjectNameError);
    const hr = await api.getProject('p-hrms');
    await expect(api.updateProject({ ...hr, name: ' qcfixer.com ' })).rejects.toBeInstanceOf(api.DuplicateProjectNameError);
    await expect(api.updateProject({ ...hr, name: 'client hrms' })).resolves.toMatchObject({ name: 'client hrms' }); // its own name
  });

  it('BR-PROJECT-02: replace overwrites the project (local changes lost)', async () => {
    const file = await fileOf(await api.exportProject('p-qcfixer'));
    const qc = await api.getProject('p-qcfixer');
    await api.updateProject({ ...qc, name: 'qcfixer local' });
    await api.deleteProject('p-hrms');
    const replaced = await api.importProject(file, 'replace');
    expect(replaced).toMatchObject({ id: 'p-qcfixer', name: 'qcfixer.com' });
    expect((await api.listProjects()).length).toBe(1);
    expect((await api.listResults('run-12')).length).toBe(83);
  });

  it('BR-PROJECT-02: import as a copy gets new IDs and "<name> (copy)", leaving the original untouched', async () => {
    const file = await fileOf(await api.exportProject('p-qcfixer'));
    const copy = await api.importProject(file, 'copy');
    expect(copy.name).toBe('qcfixer.com (copy)');
    expect(copy.id).not.toBe('p-qcfixer');
    const copyRuns = await api.listRuns(copy.id);
    expect(copyRuns.length).toBe(14);
    expect(copyRuns.some((r) => r.id === 'run-12')).toBe(false);
    const run12 = copyRuns.find((r) => r.number === 12)!;
    const results = await api.listResults(run12.id);
    expect(results.length).toBe(83);
    const copyTests = await api.listLibraryTests(copy.id);
    expect(results.every((r) => copyTests.some((t) => t.id === r.testId))).toBe(true); // references follow the new IDs
    expect((await api.listResults('run-12')).length).toBe(83); // original untouched
    const again = await api.importProject(file, 'copy');
    expect(again.name).toBe('qcfixer.com (copy 2)');
  });

  it('BR-PROJECT-01 on import: a different project with a taken name becomes "<name> (2)"', async () => {
    const file = await fileOf(await api.exportProject('p-hrms'));
    await api.deleteProject('p-hrms');
    await api.createProject({ name: 'Client HRMS', defaultModel: 'gpt-4.1', environments: [{ id: 'e', name: 'UAT' }], platforms: [] });
    expect((await api.importProject(file)).name).toBe('Client HRMS (2)');
  });

  it('load sample data (prototype only) restores the projects and keeps providers', async () => {
    await api.saveProvider(openai, { apiKey: 'k' });
    await api.factoryReset();
    await api.saveProvider(openai, { apiKey: 'k' });
    await api.loadSampleData();
    expect((await api.listProjects()).map((p) => p.name)).toEqual(['qcfixer.com', 'Client HRMS']);
    expect((await api.getGlobalSettings()).providers).toHaveLength(1);
  });
});

describe('data on this computer (Slice 2)', () => {
  it('reset settings removes providers but keeps projects', async () => {
    await api.saveProvider({ kind: 'openai', label: 'OpenAI', defaultModel: 'gpt-4.1' }, { apiKey: 'sk' });
    await api.resetSettings();
    expect((await api.getGlobalSettings()).providers).toEqual([]);
    expect((await api.listProjects()).length).toBe(2);
  });

  it('factory reset removes everything; restore from backup brings it back', async () => {
    await api.saveProvider({ kind: 'openai', label: 'OpenAI', defaultModel: 'gpt-4.1' }, { apiKey: 'sk' });
    const backup = await fileOf(await api.backUpEverything());
    await api.factoryReset();
    expect(await api.listProjects()).toEqual([]);
    expect((await api.getGlobalSettings()).providers).toEqual([]);
    await api.restoreFromBackup(backup);
    expect((await api.listProjects()).length).toBe(2);
    expect((await api.getGlobalSettings()).providers).toHaveLength(1);
    expect((await api.listResults('run-12')).length).toBe(83);
  });

  it('restore rejects a project export (wrong kind of file)', async () => {
    const file = await fileOf(await api.exportProject('p-hrms'));
    await expect(api.restoreFromBackup(file)).rejects.toBeInstanceOf(api.InvalidFileError);
  });
});
